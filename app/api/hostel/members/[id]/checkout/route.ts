import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { resolveUser, AuthUser } from "@/lib/authHelper";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id: memberId } = await context.params;
        const user = await resolveUser(req);
        await dbConnect();

        if (!user || user.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const hostelId = user.hostelId as string;

        if (!hostelId || !memberId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // 1. Mandatory Atomic Condition Lookup Check
        const updatedMember = await HostelMember.findOneAndUpdate(
            {
                _id: memberId,
                hostelId: hostelId, // Strict Tenant Isolation Enforcement
                status: { $ne: "checkout" },
                balance: { $gte: 0 } // Allow checkout if balance is 0 or positive (advance)
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
            const ghostMember = await HostelMember.findOne({ _id: memberId, hostelId }).lean() as any;
            if (!ghostMember) {
                return NextResponse.json({ error: "Member not found" }, { status: 404 });
            }
            if (ghostMember.status === "checkout") {
                return NextResponse.json({ error: "Member has already completed checkout" }, { status: 400 });
            }
            if (ghostMember.balance < 0) {
                return NextResponse.json({ error: `Member has pending dues (₹${Math.abs(ghostMember.balance)}). Cannot checkout.` }, { status: 400 });
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
