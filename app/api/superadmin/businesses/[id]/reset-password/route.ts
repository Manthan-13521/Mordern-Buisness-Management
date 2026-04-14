import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

        // Generate strong random 12 character password (hex => 12 chars)
        const rawPassword = crypto.randomBytes(6).toString("hex");
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        adminUser.passwordHash = passwordHash;
        await adminUser.save();

        return NextResponse.json({ 
            success: true, 
            newPassword: rawPassword,
            adminEmail: adminUser.email
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to reset password" }, { status: 500 });
    }
}
