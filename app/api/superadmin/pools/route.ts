import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user || user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const pools = await Pool.find().lean();
        
        return NextResponse.json(pools);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch pools" }, { status: 500 });
    }
}
