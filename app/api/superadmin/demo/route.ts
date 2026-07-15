import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { DemoRequest } from "@/models/DemoRequest";
import { ContactLead } from "@/models/ContactLead";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "GET";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            const user = await resolveUser(req);
            await dbConnect();

            if (!user || user.role !== "superadmin") {
                return NextResponse.json({ error: "Unauthorized. Superadmin only." }, { status: 403 });
            }

            const url = new URL(req.url);
            const status = url.searchParams.get("status");
            const leadType = url.searchParams.get("type"); // "demo" | "contact" | "all"

            const filter: any = {};
            if (status && status !== "all") filter.status = status;

            if (leadType === "contact") {
                const contacts = await ContactLead.find(filter).sort({ createdAt: -1 }).lean();
                const labeled = contacts.map((c: any) => ({ ...c, leadType: "contact" }));
                return NextResponse.json(labeled, { status: 200 });
            }

            if (leadType === "demo") {
                const demos = await DemoRequest.find(filter).sort({ createdAt: -1 }).lean();
                const labeled = demos.map((d: any) => ({ ...d, leadType: "demo" }));
                return NextResponse.json(labeled, { status: 200 });
            }

            // Default: return both, merged and sorted by createdAt desc
            const [demos, contacts] = await Promise.all([
                DemoRequest.find(filter).sort({ createdAt: -1 }).lean(),
                ContactLead.find(filter).sort({ createdAt: -1 }).lean(),
            ]);

            const merged = [
                ...demos.map((d: any) => ({ ...d, leadType: "demo" })),
                ...contacts.map((c: any) => ({ ...c, leadType: "contact" })),
            ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            return NextResponse.json(merged, { status: 200 });
        } catch (error) {
            console.error("[GET /api/superadmin/demo]", error);
            return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
        }
        });
            
}

export async function PATCH(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "PATCH";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            const user = await resolveUser(req);
            const [body] = await Promise.all([req.json(), dbConnect()]);

            if (!user || user.role !== "superadmin") {
                return NextResponse.json({ error: "Unauthorized. Superadmin only." }, { status: 403 });
            }

            const { _id, status, leadType } = body;

            if (!_id) {
                return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
            }

            const updateData: any = {};
            if (status) updateData.status = status;

            const updated = leadType === "contact"
                ? await ContactLead.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' })
                : await DemoRequest.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' });

            if (!updated) {
                return NextResponse.json({ error: "Lead not found" }, { status: 404 });
            }

            return NextResponse.json(updated, { status: 200 });
        } catch (error) {
            console.error("[PATCH /api/superadmin/demo]", error);
            return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
        }
        });
            
}
