import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Staff } from "@/models/Staff";
import { StaffAttendance } from "@/models/StaffAttendance";

export async function POST(req: Request) {
    try {
        await connectDB();
        const body = await req.json();
        const { poolId, staffId, method, type } = body;

        if (!poolId || !staffId || !method || !type) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const staff = await Staff.findOne({ staffId, poolId });
        if (!staff) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 });
        }

        const log = await StaffAttendance.create({
            staffId,
            poolId,
            method,
            type,
        });

        return NextResponse.json({ success: true, log });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
