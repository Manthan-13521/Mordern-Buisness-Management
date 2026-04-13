import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";


import { dispatchJob } from "@/lib/queueAdapter";

export async function POST(req: Request) {
    const authHeader = req.headers.get("authorization");

    // Allow Cron Jobs with Secret OR Authenticated Admins
    let isAuthorized = false;
    let user: AuthUser | null = null;
    let poolId: string | undefined;

    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
        isAuthorized = true;
    } else {
        await dbConnect();
        user = await resolveUser(req);
        if (user && user.role === "admin") {
            isAuthorized = true;
            poolId = user.poolId;
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }

    try {
        const result = await dispatchJob("SEND_REMINDER", { poolId });

        return NextResponse.json({
            message: "Reminders processed",
            ...result as any,
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to process reminders" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
