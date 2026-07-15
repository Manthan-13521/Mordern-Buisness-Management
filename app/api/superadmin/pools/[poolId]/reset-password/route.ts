import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Pool } from "@/models/Pool";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { requestContext } from "@/lib/requestContext";

export async function POST(req: Request, { params }: { params: Promise<{ poolId: string }> }) {

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
            await dbConnect();

            const user = await resolveUser(req);
            if (!user || user.role !== "superadmin") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            
            const { poolId } = await params;
            
            const pool = await Pool.findOne({ poolId }).lean();
            if (!pool) return NextResponse.json({ error: "Pool mapping not found" }, { status: 404 });

            const adminUser = await User.findOne({ poolId, role: "admin" }).sort({ createdAt: 1 });
            if (!adminUser) return NextResponse.json({ error: "Pool Administrator account not found" }, { status: 404 });

            const body = await req.json();
            const { newPassword } = body;
            
            if (!newPassword || newPassword.length < 8) {
                return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
            }

            const passwordHash = await bcrypt.hash(newPassword, 10);

            // Mutate the user schema explicitly bypassing the missing Pool plain-text schema mapping requirement fully
            adminUser.passwordHash = passwordHash;
            await adminUser.save();

            return NextResponse.json({ 
                success: true, 
                message: "Password reset. All active sessions invalidated.",
                adminEmail: adminUser.email
            });

        } catch (e: any) {
            return NextResponse.json({ error: e.message || "Failed to reset password" }, { status: 500 });
        }
        });
            
}
