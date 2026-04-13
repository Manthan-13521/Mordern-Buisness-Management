import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelPayment } from "@/models/HostelPayment";
import { HostelAnalytics } from "@/models/HostelAnalytics";
import { HostelRoom } from "@/models/HostelRoom";
import { HostelFloor } from "@/models/HostelFloor";
import { HostelBlock } from "@/models/HostelBlock";
import { HostelPlan } from "@/models/HostelPlan";
import { getServerSession } from "@/lib/universalAuth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user.role !== "admin" && session.user.role !== "superadmin" && session.user.role !== "hostel_admin")) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const hostelId = (session.user as any).hostelId || (session.user as any).poolId;
        if (!hostelId && session.user.role !== "superadmin") {
            return NextResponse.json({ error: "No tenant ID found for user" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        
        const baseMatch = hostelId ? { hostelId } : {};

        const [members, payments, analytics, rooms, floors, blocks, plans] = await Promise.all([
            HostelMember.find({ ...baseMatch }).lean(),
            HostelPayment.find({ ...baseMatch }).lean(),
            HostelAnalytics.find({ ...baseMatch }).lean(),
            HostelRoom.find({ ...baseMatch }).lean(),
            HostelFloor.find({ ...baseMatch }).lean(),
            HostelBlock.find({ ...baseMatch }).lean(),
            HostelPlan.find({ ...baseMatch }).lean(),
        ]);

        const backupData = {
            backupType: "full-export",
            module: "hostel",
            tenantId: hostelId || "superadmin",
            generatedAt: new Date().toISOString(),
            data: { members, payments, analytics, rooms, floors, blocks, plans },
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const buffer = Buffer.from(jsonString, "utf-8");

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Disposition": `attachment; filename="hostel_backup_${new Date().toISOString().split("T")[0]}.json"`,
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        console.error("Backup failed", error);
        return NextResponse.json({ error: "Failed to generate backup" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
