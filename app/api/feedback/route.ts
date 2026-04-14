import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Feedback } from "@/models/Feedback";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const user = await resolveUser(req);
        const [body] = await Promise.all([req.json(), dbConnect()]);
        
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const userId = user.id;
        const userName = user.name || user.email || "Unknown User";

        const { type, message, screenshot, page } = body;

        if (!type || !message || !page) {
            return NextResponse.json({ error: "Missing required fields" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Basic Rate Limiting: Max 1 feedback per 5 minutes per user
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentFeedback = await Feedback.findOne({ userId, createdAt: { $gte: fiveMinutesAgo } });

        if (recentFeedback) {
            return NextResponse.json({ error: "Please wait 5 minutes before submitting another report." }, {  status: 429 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
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

        return NextResponse.json(newFeedback, {  status: 201 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[POST /api/feedback]", error);
        return NextResponse.json({ error: "Server error submitting feedback" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
