import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { HostelStaffAdvance } from "@/models/HostelStaffAdvance";
import { Pool } from "@/models/Pool";
import { Hostel } from "@/models/Hostel";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

async function resolveTenant(slug: string, type: "pool" | "hostel") {
  await dbConnect();
  if (type === "pool") {
    const pool = await Pool.findOne({ slug }).lean();
    if (!pool) throw new Error("Pool not found");
    return pool.poolId;
  } else {
    const hostel = await Hostel.findOne({ slug }).lean();
    if (!hostel) throw new Error("Hostel not found");
    return hostel.hostelId;
  }
}

export async function POST(req: Request, props: { params: Promise<{ hostelSlug: string }> }) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "POST";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
        const { hostelSlug } = await props.params;
        const user = await resolveUser(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const tenantId = await resolveTenant(hostelSlug, "hostel");
        const { validateTenantAccess } = await import("@/lib/tenant");
        if (!validateTenantAccess(user, tenantId, "hostel")) {
          return NextResponse.json({ error: "Access denied: hostel mismatch" }, { status: 403 });
        }
        const { staffId, month, amount } = await req.json();

        const advance = await HostelStaffAdvance.findOneAndUpdate(
          { staffId, month, hostelId: tenantId },
          { $set: { amount } },
          { upsert: true, new: true }
        );

        return NextResponse.json(advance);
      } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
        });
            
}