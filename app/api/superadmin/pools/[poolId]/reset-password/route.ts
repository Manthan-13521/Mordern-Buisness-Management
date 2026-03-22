import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Pool } from "@/models/Pool";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(req: Request, { params }: { params: Promise<{ poolId: string }> }) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        const { poolId } = await params;
        
        const pool = await Pool.findOne({ poolId }).lean();
        if (!pool) return NextResponse.json({ error: "Pool mapping not found" }, { status: 404 });

        const user = await User.findOne({ poolId, role: "admin" }).sort({ createdAt: 1 });
        if (!user) return NextResponse.json({ error: "Pool Administrator account not found" }, { status: 404 });

        // Generate strong random 12 character password
        const rawPassword = crypto.randomBytes(6).toString("hex");
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        // Mutate the user schema explicitly bypassing the missing Pool plain-text schema mapping requirement fully
        user.passwordHash = passwordHash;
        await user.save();

        return NextResponse.json({ 
            success: true, 
            newPassword: rawPassword,
            adminEmail: user.email
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to reset password" }, { status: 500 });
    }
}
