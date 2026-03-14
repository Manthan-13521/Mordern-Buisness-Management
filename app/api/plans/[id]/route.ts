import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Plan } from "@/models/Plan";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
        }

        const body = await req.json();
        // Strip potentially dangerous fields from body
        delete body._id;
        delete body.deletedAt;

        await connectDB();

        const updatedPlan = await Plan.findByIdAndUpdate(id, body, { new: true });

        if (!updatedPlan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        return NextResponse.json(updatedPlan, { status: 200 });
    } catch (error) {
        console.error("Failed to update plan:", error);
        return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
        }

        await connectDB();

        // Soft-delete: set deletedAt timestamp so it disappears from charts
        // but historical data (member records, payments) stays intact
        const softDeleted = await Plan.findByIdAndUpdate(
            id,
            { $set: { deletedAt: new Date() } },
            { new: true }
        );

        if (!softDeleted) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Plan deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Failed to delete plan:", error);
        return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
    }
}
