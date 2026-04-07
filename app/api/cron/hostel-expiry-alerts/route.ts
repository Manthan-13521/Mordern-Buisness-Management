import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { Hostel } from "@/models/Hostel";
import { HostelSettings } from "@/models/HostelSettings";
import { decryptToken } from "@/lib/twilioService";
import twilio from "twilio";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET || "";

/**
 * GET /api/cron/hostel-expiry-alerts
 * Sends WhatsApp expiry alerts for hostel members expiring within 3 days.
 * Completely independent from the pool cron — no shared imports.
 */
export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + IST_OFFSET);
    const startOfDayIST = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));
    startOfDayIST.setTime(startOfDayIST.getTime() - IST_OFFSET);
    const in3Days = new Date(startOfDayIST.getTime() + 3 * 86_400_000);

    // Get all Twilio-connected, active hostels
    const hostels = await Hostel.find({ isTwilioConnected: true, status: "ACTIVE" })
        .select("hostelId hostelName twilio")
        .lean() as any[];

    const results: Record<string, any> = {};

    for (const hostel of hostels) {
        const { hostelId, hostelName, twilio: tw } = hostel;
        if (!tw?.sid || !tw?.authToken_encrypted || !tw?.iv) continue;

        // Check WhatsApp enabled for this hostel
        const settings = await HostelSettings.findOne({ hostelId }).lean() as any;
        if (!settings?.whatsappEnabled) continue;

        const expiringMembers = await HostelMember.find({
            hostelId,
            isDeleted: false,
            isActive: true,
            isExpired: false,
            planEndDate: { $gte: startOfDayIST, $lte: in3Days },
        }).select("name phone planEndDate blockNo floorNo roomNo memberId").lean() as any[];

        if (expiringMembers.length === 0) {
            results[hostelId] = { sent: 0, skipped: 0 };
            continue;
        }

        let authToken: string;
        try {
            authToken = decryptToken(tw.authToken_encrypted, tw.iv);
        } catch {
            results[hostelId] = { error: "Decryption failed" };
            continue;
        }

        const client = twilio(tw.sid, authToken);
        const fromNumber = tw.whatsappNumber;
        const template = settings?.whatsappMessageTemplate ||
            "Dear {name}, your stay at {hostelName} expires on {expiry}. Please renew to avoid interruption. Contact management for assistance.";

        let sent = 0;
        let skipped = 0;

        for (const member of expiringMembers) {
            if (!member.phone) { skipped++; continue; }
            const rawPhone = member.phone.replace(/\D/g, "");
            const toBase = rawPhone.startsWith("91") && rawPhone.length === 12 ? `+${rawPhone}` : `+91${rawPhone}`;
            const to = `whatsapp:${toBase}`;
            const expiry = new Date(member.planEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const msg = template
                .replace("{name}", member.name)
                .replace("{hostelName}", hostelName)
                .replace("{expiry}", expiry)
                .replace("{room}", `${member.blockNo}-${member.floorNo}-${member.roomNo}`)
                .replace("{memberId}", member.memberId);
            try {
                await client.messages.create({ from: fromNumber, to, body: msg });
                sent++;
            } catch (e: any) {
                console.error(`[hostel-expiry-alert] Failed for ${member.memberId}:`, e?.message);
                skipped++;
            }
        }

        results[hostelId] = { sent, skipped, total: expiringMembers.length };
    }

    return NextResponse.json({ ok: true, results, at: now.toISOString() });
}
