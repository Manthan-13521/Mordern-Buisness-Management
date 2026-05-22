import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Ad } from "@/models/Ad";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        await dbConnect();
        
        const updatedAd = await Ad.findByIdAndUpdate(id, body, { new: true });
        if (!updatedAd) {
            return NextResponse.json({ error: "Ad not found" }, { status: 404 });
        }

        return NextResponse.json(updatedAd);
    } catch (error) {
        console.error("PUT /api/superadmin/ads/[id] error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        await dbConnect();
        
        const deletedAd = await Ad.findByIdAndDelete(id);
        if (!deletedAd) {
            return NextResponse.json({ error: "Ad not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/superadmin/ads/[id] error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
