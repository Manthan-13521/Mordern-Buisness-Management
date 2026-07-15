import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Ad } from "@/models/Ad";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requestContext } from "@/lib/requestContext";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "PUT";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            const session = await getServerSession(authOptions);
            if (!session || session.user.role !== "superadmin") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const { id } = await params;
            const body = await req.json();

            await dbConnect();
            
            const updatedAd = await Ad.findByIdAndUpdate(id, body, { new: true });
            if (!updatedAd) {
                return NextResponse.json({ error: "Ad not found" }, { status: 404 });
            }

            return NextResponse.json(updatedAd);
        } catch (error) {
            console.error("PUT /api/superadmin/ads/[id] error:", error);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
        });
            
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "DELETE";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            const session = await getServerSession(authOptions);
            if (!session || session.user.role !== "superadmin") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const { id } = await params;

            await dbConnect();
            
            const deletedAd = await Ad.findByIdAndDelete(id);
            if (!deletedAd) {
                return NextResponse.json({ error: "Ad not found" }, { status: 404 });
            }

            return NextResponse.json({ success: true });
        } catch (error) {
            console.error("DELETE /api/superadmin/ads/[id] error:", error);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
        });
            
}
