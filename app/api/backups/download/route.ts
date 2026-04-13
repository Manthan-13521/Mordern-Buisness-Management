import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { downloadBackup } from "@/lib/s3";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const user = await resolveUser(req);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }

    const url = new URL(req.url);
    const key = url.searchParams.get("key");

    if (!key) {
        return NextResponse.json({ error: "Missing key parameter" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }

    // Security constraint: users can only download files in their own pool's folder
    const poolFolder = user.role === "superadmin" ? "superadmin" : user.poolId;
    if (!key.startsWith(`backups/${poolFolder}/`)) {
        return NextResponse.json({ error: "Unauthorized access to this backup" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }

    try {
        const { stream, contentType } = await downloadBackup(key);
        const filename = key.split("/").pop() || "backup.xlsx";
        
        // Pass the Node.js Readable stream natively into Next.js Response
        return new NextResponse(stream as any, {
            headers: {
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Type": contentType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
        });

    } catch (error: any) {
        if (error.message === "GLACIER_RESTORE_REQUIRED") {
            return NextResponse.json({ 
                error: "Restore required (may take several hours depending on Glacier tier). This backup is currently in Glacier deep storage.",
                isGlacier: true
            }, {  status: 409 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        
        return NextResponse.json({ error: "Failed to download backup: " + String(error) }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
