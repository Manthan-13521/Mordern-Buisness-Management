import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Plan } from "@/models/Plan";

import { PlanSchema } from "@/lib/validators";
import { secureUpdateById } from "@/lib/tenantSecurity";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();

        const user = await resolveUser(req);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Plan ID is required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const body = await req.json();
        
        // Use Zod to validate the update body
        const result = PlanSchema.partial().safeParse(body);
        if (!result.success) {
            const errs = result.error.flatten().fieldErrors;
            const errMsg = Object.entries(errs).map(([f, m]) => `${f}: ${(m as string[])?.join(", ")}`).join(" | ") || result.error.flatten().formErrors?.join(", ") || "Validation failed";
            return NextResponse.json({ error: errMsg }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
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

        const updatedPlan = await secureUpdateById(Plan, id, { $set: updateFields }, user);

        if (!updatedPlan) {
            return NextResponse.json({ error: "Not Found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        return NextResponse.json(updatedPlan, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("Failed to update plan:", error);
        return NextResponse.json({ error: "Failed to update plan" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();

        const user = await resolveUser(req);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Plan ID is required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Soft-delete: set deletedAt timestamp so it disappears from charts
        // but historical data (member records, payments) stays intact
        const softDeleted = await secureUpdateById(Plan, id, { $set: { deletedAt: new Date() } }, user);

        if (!softDeleted) {
            return NextResponse.json({ error: "Not Found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        return NextResponse.json({ message: "Plan deleted successfully" }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("Failed to delete plan:", error);
        return NextResponse.json({ error: "Failed to delete plan" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
