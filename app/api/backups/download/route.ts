import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { downloadBackup } from "@/lib/s3";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const key = url.searchParams.get("key");

    if (!key) {
        return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    // Security constraint: users can only download files in their own pool's folder
    const poolFolder = session.user.role === "superadmin" ? "superadmin" : session.user.poolId;
    if (!key.startsWith(`backups/${poolFolder}/`)) {
        return NextResponse.json({ error: "Unauthorized access to this backup" }, { status: 403 });
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
            }, { status: 409 });
        }
        
        return NextResponse.json({ error: "Failed to download backup: " + String(error) }, { status: 500 });
    }
}
