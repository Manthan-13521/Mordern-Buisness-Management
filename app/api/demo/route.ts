import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { DemoRequest } from "@/models/DemoRequest";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "POST";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
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
                name: name.trim(),
                phone: phone.trim(),
                email:        email?.trim()        || "",
                businessName: businessName?.trim() || "",
                businessType: businessType         || "other",
                city:         city?.trim()         || "",
                notes:        notes?.trim()        || "",
                source:       source               || "website",
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
        });
            
}
