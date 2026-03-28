import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Plan } from "@/models/Plan";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PlanSchema } from "@/lib/validators";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
        }

        const body = await req.json();
        
        // Use Zod to validate the update body
        const result = PlanSchema.partial().safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
        }

        const data = result.data;

        // Build a safe update set — include messages and alert flags explicitly
        const updateFields: Record<string, unknown> = { ...data };

        // Sync legacy whatsAppAlert with canonical enableWhatsAppAlerts
        if (typeof data.enableWhatsAppAlerts === "boolean") {
            updateFields.whatsAppAlert = data.enableWhatsAppAlerts;
        } else if (typeof (data as any).whatsAppAlert === "boolean") {
            updateFields.enableWhatsAppAlerts = (data as any).whatsAppAlert;
        }

        // Merge messages sub-document (from body directly if Zod strips it)
        if (body.messages) {
            updateFields.messages = body.messages;
        }

        const updatedPlan = await Plan.findByIdAndUpdate(id, { $set: updateFields }, { new: true });

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
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
        }

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
