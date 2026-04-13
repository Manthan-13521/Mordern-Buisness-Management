import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // disable caching

export async function GET(req: Request) {
  try {
    const memory = process.memoryUsage();

    return NextResponse.json({
        status: "alive",
        uptime: process.uptime(), // in seconds
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        memory: {
          rss: memory.rss,
          heapTotal: memory.heapTotal,
          heapUsed: memory.heapUsed,
          external: memory.external,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
  } catch (error) {
    return NextResponse.json({
        status: "error",
        message: "Health check failed",
      }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
  }
}