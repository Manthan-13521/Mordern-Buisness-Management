import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Settings, getSettings } from "@/models/Settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        await connectDB();
        const settings = await getSettings();
        return NextResponse.json({
            poolCapacity: settings.poolCapacity,
            currentOccupancy: settings.currentOccupancy,
            available: Math.max(0, settings.poolCapacity - settings.currentOccupancy),
            lastBackupAt: settings.lastBackupAt,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch capacity" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { poolCapacity, currentOccupancy } = body;

        await connectDB();
        const settings = await getSettings();

        if (typeof poolCapacity === "number" && poolCapacity > 0) {
            settings.poolCapacity = poolCapacity;
        }
        if (typeof currentOccupancy === "number" && currentOccupancy >= 0) {
            settings.currentOccupancy = currentOccupancy;
        }
        await settings.save();

        return NextResponse.json({
            poolCapacity: settings.poolCapacity,
            currentOccupancy: settings.currentOccupancy,
            available: Math.max(0, settings.poolCapacity - settings.currentOccupancy),
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update capacity" }, { status: 500 });
    }
}
