import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        // Only admins should delete members
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await props.params;
        const memberId = id;
        if (!memberId) {
            return NextResponse.json({ error: "Missing member ID" }, { status: 400 });
        }

        await connectDB();

        // Hard delete the member
        const deletedMember = await Member.findByIdAndDelete(memberId);

        if (!deletedMember) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Member deleted successfully" });
    } catch (error) {
        console.error("Delete Member Error:", error);
        return NextResponse.json({ error: "Server error deleting member" }, { status: 500 });
    }
}
