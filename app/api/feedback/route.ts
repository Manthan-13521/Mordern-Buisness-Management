import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { dbConnect } from "@/lib/mongodb";
import { Feedback } from "@/models/Feedback";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const [token, body] = await Promise.all([
            getToken({ req: req as any }),
            req.json(),
            dbConnect(),
        ]);
        
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sessionUser = token as any;
        const userId = sessionUser.id || sessionUser.sub;
        const userName = sessionUser.name || sessionUser.email || "Unknown User";

        const { type, message, screenshot, page } = body;

        if (!type || !message || !page) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Basic Rate Limiting: Max 1 feedback per 5 minutes per user
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentFeedback = await Feedback.findOne({ userId, createdAt: { $gte: fiveMinutesAgo } });

        if (recentFeedback) {
            return NextResponse.json({ error: "Please wait 5 minutes before submitting another report." }, { status: 429 });
        }

        const newFeedback = await Feedback.create({
            userId,
            userName,
            type,
            message,
            screenshot: screenshot || "",
            page,
            status: "open",
            priority: "low", // default, superadmin can escalate
        });

        return NextResponse.json(newFeedback, { status: 201 });
    } catch (error: any) {
        console.error("[POST /api/feedback]", error);
        return NextResponse.json(
            { error: "Server error submitting feedback" },
            { status: 500 }
        );
    }
}
