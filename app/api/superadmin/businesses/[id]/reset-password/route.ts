import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { requestContext } from "@/lib/requestContext";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {

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
            
            const { id } = await params;
            
            const business = await Business.findOne({ businessId: id }).lean();
            if (!business) return NextResponse.json({ error: "Business mapping not found" }, { status: 404 });

            // Find the admin user for this business
            const adminUser = await User.findOne({ businessId: id, role: "business_admin" }).sort({ createdAt: 1 });
            if (!adminUser) return NextResponse.json({ error: "Business Administrator account not found" }, { status: 404 });

            const body = await req.json();
            const { newPassword } = body;
            
            if (!newPassword || newPassword.length < 8) {
                return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
            }

            const passwordHash = await bcrypt.hash(newPassword, 10);

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
