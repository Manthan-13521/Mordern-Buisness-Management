import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Plan } from "@/models/Plan";

import { PlanSchema } from "@/lib/validators";
import { secureUpdateById } from "@/lib/tenantSecurity";
import { requestContext } from "@/lib/requestContext";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "PUT";

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

            // ── AUDIT LOG: Plan Updated ───────────────────────────────────
            const { logger } = await import("@/lib/logger");
            logger.audit({
                type: "PLAN_UPDATED",
                userId: user.id,
                poolId: updatedPlan.poolId,
                meta: {
                    planId: updatedPlan._id,
                    planName: updatedPlan.name,
                    updatedFields: Object.keys(updateFields),
                    changedBy: user.email || user.id,
                }
            });

            return NextResponse.json(updatedPlan, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        } catch (error) {
            console.error("Failed to update plan:", error);
            return NextResponse.json({ error: "Failed to update plan" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        });
            
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "DELETE";

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
            if (!user || user.role !== "admin") {
                return NextResponse.json({ error: "Unauthorized" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            const { id } = await params;
            if (!id) {
                return NextResponse.json({ error: "Plan ID is required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            // Soft-delete: set deletedAt timestamp so it disappears from charts
            // but historical data (member records, payments) stays intact
            const softDeleted = await secureUpdateById(Plan, id, { $set: { deletedAt: new Date() } }, user) as any;

            if (!softDeleted) {
                return NextResponse.json({ error: "Not Found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            // ── AUDIT LOG: Plan Deleted ───────────────────────────────────
            const { logger } = await import("@/lib/logger");
            logger.audit({
                type: "PLAN_DELETED",
                userId: user.id,
                poolId: softDeleted.poolId,
                meta: {
                    planId: softDeleted._id,
                    planName: softDeleted.name,
                    deletedBy: user.email || user.id,
                }
            });

            return NextResponse.json({ message: "Plan deleted successfully" }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        } catch (error) {
            console.error("Failed to delete plan:", error);
            return NextResponse.json({ error: "Failed to delete plan" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        });
            
}
