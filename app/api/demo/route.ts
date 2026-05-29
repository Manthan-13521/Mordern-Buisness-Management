import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { DemoRequest } from "@/models/DemoRequest";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const [body] = await Promise.all([req.json(), dbConnect()]);

        const { name, email, phone, businessName, businessType, city, notes, source } = body;

        if (!name || !email || !phone || !businessName || !businessType) {
            return NextResponse.json(
                { error: "Name, email, phone, business name, and business type are required." },
                { status: 400 }
            );
        }

        // Basic rate limiting: max 1 demo request per email per hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentRequest = await DemoRequest.findOne({ email, createdAt: { $gte: oneHourAgo } });

        if (recentRequest) {
            return NextResponse.json(
                { error: "A demo request from this email was recently submitted. Please wait before trying again." },
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
