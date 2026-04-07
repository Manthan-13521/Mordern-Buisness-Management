import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ReferralCode } from "@/models/ReferralCode";
import { ReferralUsage } from "@/models/ReferralUsage";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        // Get all codes
        const codes = await ReferralCode.find({}).sort({ createdAt: -1 }).lean();

        // Aggregate usage stats
        const usageStats = await ReferralUsage.aggregate([
            {
                $group: {
                    _id: "$code",
                    uses: { $sum: 1 },
                    revenueDiscounted: { $sum: "$discountApplied" }
                }
            }
        ]);

        const statsMap = usageStats.reduce((acc, curr) => {
            acc[curr._id] = curr;
            return acc;
        }, {});

        // Fetch totals
        const totalReferralUsers = await ReferralUsage.countDocuments();
        const totalDiscounts = usageStats.reduce((acc, curr) => acc + curr.revenueDiscounted, 0);

        // Map data for response
        const mappedCodes = codes.map((c: any) => ({
            ...c,
            revenueImpact: statsMap[c.code]?.revenueDiscounted || 0,
            actualUses: statsMap[c.code]?.uses || 0
        }));

        mappedCodes.sort((a, b) => b.actualUses - a.actualUses); // Sort by highest usage

        return NextResponse.json({
            codes: mappedCodes,
            totalReferralUsers,
            totalDiscounts,
            topCode: mappedCodes.length > 0 ? mappedCodes[0].code : "N/A"
        });

    } catch (e) {
        console.error("Referral fetch error", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();
        const { code, discountType, discountValue, maxUses, expiresAt } = body;

        if (!code || !discountType || discountValue === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const existing = await ReferralCode.findOne({ code: { $regex: new RegExp(`^${code}$`, 'i') } });
        if (existing) {
            return NextResponse.json({ error: "Code already exists" }, { status: 400 });
        }

        const newCode = await ReferralCode.create({
            code,
            createdBy: new mongoose.Types.ObjectId(session.user.id),
            discountType,
            discountValue,
            maxUses: maxUses || 0,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined
        });

        return NextResponse.json(newCode, { status: 201 });

    } catch (e) {
        console.error("Referral create error", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
