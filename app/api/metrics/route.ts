import { NextResponse } from "next/server";
import { register } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    // Basic auth or internal network guard usually goes here, optionally
    // if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) ...

    try {
        const metrics = await register.metrics();
        return new NextResponse(metrics, {
            status: 200,
            headers: {
                "Content-Type": register.contentType,
            },
        });
    } catch (ex) {
        return NextResponse.json({ error: "Failed to collect metrics" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
