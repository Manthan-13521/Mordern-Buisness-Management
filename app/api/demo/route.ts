import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { DemoRequest } from "@/models/DemoRequest";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const [body] = await Promise.all([req.json(), dbConnect()]);

        const { name, email, phone, businessName, businessType, city, notes, source } = body;

        if (!name || !phone) {
            return NextResponse.json(
                { error: "Name and phone number are required." },
                { status: 400 }
            );
        }

        // Basic rate limiting: max 1 demo request per phone per hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentRequest = await DemoRequest.findOne({ phone, createdAt: { $gte: oneHourAgo } });

        if (recentRequest) {
            return NextResponse.json(
                { error: "A demo request from this phone number was recently submitted. Please wait before trying again." },
                { status: 429 }
            );
        }

        const newRequest = await DemoRequest.create({
            name,
            email,
            phone,
            businessName,
            businessType,
            city: city || "",
            notes: notes || "",
            source: source || "website",
            status: "new",
        });

        // Non-blocking notification log
        console.log(`[NEW DEMO LEAD] ${name} (${email}) — ${businessType} — ${businessName}`);

        return NextResponse.json(
            { message: "Demo request submitted successfully.", id: newRequest._id },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("[POST /api/demo]", error);
        return NextResponse.json(
            { error: "Failed to submit demo request. Please try again." },
            { status: 500 }
        );
    }
}
