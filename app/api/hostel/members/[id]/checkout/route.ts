import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { HostelMember } from "@/models/HostelMember";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id: memberId } = await context.params;
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const hostelId = token.hostelId as string;

        if (!hostelId || !memberId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // 1. Mandatory Atomic Condition Lookup Check
        const updatedMember = await HostelMember.findOneAndUpdate(
            {
                _id: memberId,
                hostelId: hostelId, // Strict Tenant Isolation Enforcement
                status: { $ne: "checkout" },
                balance: { $gte: 0 } // Hard Rule: Checkout mathematically blocked if dues exist
            },
            {
                $set: {
                    status: "checkout",
                    checkoutDate: new Date(),
                    isActive: false // Systematically lock out UI interactions for checked-out state
                }
            },
            { new: true }
        );

        if (!updatedMember) {
            // Fail gracefully if checkout blocked by logic or dual-run race conditionally
            const ghostMember = await HostelMember.findOne({ _id: memberId, hostelId }).lean();
            if (!ghostMember) {
                return NextResponse.json({ error: "Member not found" }, { status: 404 });
            }
            if (ghostMember.status === "checkout") {
                return NextResponse.json({ error: "Member has already completed checkout" }, { status: 400 });
            }
            if (ghostMember.balance && ghostMember.balance < 0) {
                return NextResponse.json({ error: "Clear dues before checkout" }, { status: 400 });
            }
            return NextResponse.json({ error: "Failed to process checkout transaction" }, { status: 400 });
        }

        return NextResponse.json({ 
            success: true, 
            message: "Member successfully transitioned to checkout state",
            checkoutDate: updatedMember.checkoutDate 
        });

    } catch (error: any) {
        console.error("[POST /api/hostel/members/[id]/checkout]", error);
        return NextResponse.json(
            { error: "Server encountered an error processing checkout" }, 
            { status: 500 }
        );
    }
}
