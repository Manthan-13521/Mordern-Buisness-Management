import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Plan } from "@/models/Plan";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get("slug");
        
        // 1. If public request with slug, fetch that pool's specific plans
        if (slug) {
            const PoolModel = mongoose.models.Pool || mongoose.model("Pool", new mongoose.Schema({ slug: String, poolName: String, poolId: String }));
            const pool = await PoolModel.findOne({ slug });
            if (!pool) return NextResponse.json({ error: "Pool not found" }, { status: 404 });
            
            const plans = await Plan.find({ deletedAt: null, poolId: pool.poolId }).sort({ price: 1 });
            return NextResponse.json({ poolName: pool.poolName, plans });
        }

        // 2. Otherwise try to use admin session
        const session = await getServerSession(authOptions);
        if (session?.user?.poolId) {
            const plans = await Plan.find({ deletedAt: null, poolId: session.user.poolId }).sort({ price: 1 });
            return NextResponse.json(plans);
        }

        // 3. Fallback to global plans (e.g. Super Admin or generic)
        const plans = await Plan.find({ deletedAt: null }).sort({ price: 1 });
        return NextResponse.json(plans);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        // Only Admin can create plans
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, durationDays, durationHours, durationMinutes, durationSeconds, price, features, whatsAppAlert, allowQuantity, voiceAlert } = await req.json();

        if (!name || price === undefined || (durationDays === undefined && durationHours === undefined && durationMinutes === undefined && durationSeconds === undefined)) {
            return NextResponse.json({ error: "Missing required duration fields" }, { status: 400 });
        }

        await connectDB();

        const plan = new Plan({
            name,
            poolId: session.user.poolId, // Inject specific poolId
            durationDays,
            durationHours,
            durationMinutes,
            durationSeconds,
            price,
            features: features || [],
            whatsAppAlert: whatsAppAlert || false,
            allowQuantity: allowQuantity || false,
            voiceAlert: voiceAlert || false,
        });

        await plan.save();
        return NextResponse.json(plan, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
    }
}
