import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";

import { Hostel } from "@/models/Hostel";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// GET /api/superadmin/hostels/[hostelId] — single hostel detail
export async function GET(req: Request, { params }: { params: Promise<{ hostelId: string }> }) {
    try {
        const [user, { hostelId }] = await Promise.all([resolveUser(req), params]);
        await dbConnect();
        if (!user || user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const hostel = await Hostel.findOne({ hostelId }).lean();
        if (!hostel) return NextResponse.json({ error: "Hostel not found" }, { status: 404 });

        const adminUser = await User.findOne({ hostelId, role: "hostel_admin" }).select("name email isActive").lean();
        return NextResponse.json({ ...hostel, adminUser });
    } catch (error) {
        console.error("[GET /api/superadmin/hostels/[hostelId]]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// PATCH /api/superadmin/hostels/[hostelId] — update status / metadata / reset password
export async function PATCH(req: Request, { params }: { params: Promise<{ hostelId: string }> }) {
    try {
        const [user, { hostelId }, body] = await Promise.all([resolveUser(req), params, req.json()]);
        await dbConnect();
        if (!user || user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { action, newPassword, hostelName, city, adminPhone, numberOfBlocks, status } = body;

        if (action === "reset-password") {
            if (!newPassword || newPassword.length < 8) {
                return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
            }
            const passwordHash = await bcrypt.hash(newPassword, 12);
            // Invalidate all sessions by rotating the passwordHash
            const updated = await User.findOneAndUpdate(
                { hostelId, role: "hostel_admin" },
                { $set: { passwordHash, updatedAt: new Date() } },
                { returnDocument: 'after' }
            ).select("email").lean();
            if (!updated) return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
            return NextResponse.json({ success: true, message: "Password reset. All active sessions invalidated." });
        }

        if (action === "toggle-status") {
            const hostel = await Hostel.findOne({ hostelId }).lean() as any;
            if (!hostel) return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
            const newStatus = hostel.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
            await Promise.all([
                Hostel.updateOne({ hostelId }, { $set: { status: newStatus } }),
                User.updateOne({ hostelId, role: "hostel_admin" }, { $set: { isActive: newStatus === "ACTIVE" } }),
            ]);
            return NextResponse.json({ success: true, status: newStatus });
        }

        // Update metadata
        const updates: Record<string, unknown> = {};
        if (hostelName) updates.hostelName = hostelName;
        if (city) updates.city = city;
        if (adminPhone !== undefined) updates.adminPhone = adminPhone;
        if (numberOfBlocks) updates.numberOfBlocks = Math.min(4, Math.max(1, numberOfBlocks));
        if (status) updates.status = status;

        const hostel = await Hostel.findOneAndUpdate({ hostelId }, { $set: updates }, { returnDocument: 'after' }).lean();
        if (!hostel) return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
        return NextResponse.json(hostel);
    } catch (error: any) {
        console.error("[PATCH /api/superadmin/hostels/[hostelId]]", error);
        return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
    }
}

// DELETE /api/superadmin/hostels/[hostelId] — cascade delete hostel and all associated data
export async function DELETE(req: Request, { params }: { params: Promise<{ hostelId: string }> }) {
    try {
        const [user, { hostelId }] = await Promise.all([resolveUser(req), params]);
        await dbConnect();

        if (!user || user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!hostelId) {
            return NextResponse.json({ error: "Missing hostel ID" }, { status: 400 });
        }

        const hostel = await Hostel.findOne({ hostelId });
        if (!hostel) {
            return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
        }

        // Cascade delete
        try {
            const { User } = await import("@/models/User");
            await User.deleteMany({ hostelId });
        } catch {}
        try {
            const { HostelBlock } = await import("@/models/HostelBlock");
            await HostelBlock.deleteMany({ hostelId });
        } catch {}
        try {
            const { HostelFloor } = await import("@/models/HostelFloor");
            await HostelFloor.deleteMany({ hostelId });
        } catch {}
        try {
            const { HostelRoom } = await import("@/models/HostelRoom");
            await HostelRoom.deleteMany({ hostelId });
        } catch {}
        try {
            const { HostelMember } = await import("@/models/HostelMember");
            await HostelMember.deleteMany({ hostelId });
        } catch {}
        try {
            const { HostelStaff } = await import("@/models/HostelStaff");
            await HostelStaff.deleteMany({ hostelId });
        } catch {}
        try {
            const { HostelStaffAttendance } = await import("@/models/HostelStaffAttendance");
            await HostelStaffAttendance.deleteMany({ hostelId });
        } catch {}
        try {
            const { HostelPayment } = await import("@/models/HostelPayment");
            await HostelPayment.deleteMany({ hostelId });
        } catch {}
        try {
            const { HostelRenewal } = await import("@/models/HostelRenewal");
            await HostelRenewal.deleteMany({ hostelId });
        } catch {}
        try {
            const { HostelSettings } = await import("@/models/HostelSettings");
            await HostelSettings.deleteMany({ hostelId });
        } catch {}
        try {
            const { HostelLog } = await import("@/models/HostelLog");
            await HostelLog.deleteMany({ hostelId });
        } catch {}
        try {
            const { HostelPlan } = await import("@/models/HostelPlan");
            await HostelPlan.deleteMany({ hostelId });
        } catch {}

        await Hostel.deleteOne({ hostelId });

        return NextResponse.json({ message: `Hostel "${hostel.hostelName}" deleted successfully` });
    } catch (error: any) {
        console.error("[DELETE /api/superadmin/hostels/[hostelId]]", error);
        return NextResponse.json({ error: error?.message || "Server error deleting hostel" }, { status: 500 });
    }
}

