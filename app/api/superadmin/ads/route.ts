import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Ad } from "@/models/Ad";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        // Fetch all ads for the superadmin dashboard, sorted by creation date descending
        const ads = await Ad.find().sort({ createdAt: -1 }).lean();
        return NextResponse.json(ads);
    } catch (error) {
        console.error("GET /api/superadmin/ads error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        
        // Basic validation
        if (!body.title || !body.imageUrl || !body.type || !body.startDate || !body.endDate || !body.targetModules || !body.targetPages) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect();
        
        const newAd = new Ad({
            ...body,
            createdBy: session.user.id,
        });

        await newAd.save();
        return NextResponse.json(newAd, { status: 201 });
    } catch (error) {
        console.error("POST /api/superadmin/ads error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
