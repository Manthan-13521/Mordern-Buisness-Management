import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { ContactLead } from "@/models/ContactLead";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const [body] = await Promise.all([req.json(), dbConnect()]);

        const { name, email, phone, message, source } = body;

        if (!name || !email || !message) {
            return NextResponse.json(
                { error: "Name, email, and message are required." },
                { status: 400 }
            );
        }

        // Basic rate limiting: max 1 contact per email per 30 minutes
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        const recentContact = await ContactLead.findOne({ email, createdAt: { $gte: thirtyMinsAgo } });

        if (recentContact) {
            return NextResponse.json(
                { error: "A contact request from this email was recently submitted. Please wait before trying again." },
                { status: 429 }
            );
        }

        const newContact = await ContactLead.create({
            name,
            email,
            phone: phone || "",
            message,
            source: source || "contact-form",
            status: "new",
        });

        // Non-blocking notification log
        console.log(`[NEW CONTACT LEAD] ${name} (${email}) — "${message.substring(0, 100)}"`);

        return NextResponse.json(
            { message: "Contact request submitted successfully.", id: newContact._id },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("[POST /api/contact]", error);
        return NextResponse.json(
            { error: "Failed to submit contact request. Please try again." },
            { status: 500 }
        );
    }
}
