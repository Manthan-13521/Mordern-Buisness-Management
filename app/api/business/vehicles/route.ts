import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessVehicle } from "@/models/BusinessVehicle";
import { requireBusinessId } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const VehicleCreateSchema = z.object({
    ownerName: z.string().min(1, "Owner name is required").max(100),
    vehicleNumber: z.string().min(1, "Vehicle number is required").max(20),
});

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        let businessId;
        try {
            businessId = requireBusinessId(user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        await dbConnect();

        if (!businessId) {
            throw new Error("Tenant context lost before query execution");
        }

        const vehicles = await BusinessVehicle.find({ businessId }).sort({ createdAt: -1 }).lean();

        return NextResponse.json({
            data: vehicles,
            meta: {
                count: vehicles.length,
                businessId,
                timestamp: new Date().toISOString()
            }
        }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        return NextResponse.json({
            data: [],
            meta: {
                error: "Failed to fetch vehicles",
                details: error.message,
                timestamp: new Date().toISOString()
            }
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const parsed = VehicleCreateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        let businessId;
        try {
            businessId = requireBusinessId(user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        await dbConnect();

        if (!businessId) {
            throw new Error("Tenant context lost before database operation");
        }

        const normalizedNumber = parsed.data.vehicleNumber.toUpperCase().replace(/\s+/g, "");

        // Check for duplicate
        const existing = await BusinessVehicle.findOne({ businessId, vehicleNumber: normalizedNumber });
        if (existing) {
            return NextResponse.json({ error: "Vehicle number already exists" }, { status: 409 });
        }

        const vehicle = new BusinessVehicle({
            ownerName: parsed.data.ownerName.trim(),
            vehicleNumber: normalizedNumber,
            businessId,
        });

        await vehicle.save();

        return NextResponse.json({
            data: vehicle,
            meta: {
                message: "Vehicle added successfully",
                businessId,
                timestamp: new Date().toISOString()
            }
        }, {
            status: 201,
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        return NextResponse.json({
            data: null,
            meta: {
                error: "Failed to add vehicle",
                details: error.message,
                timestamp: new Date().toISOString()
            }
        }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let businessId;
        try {
            businessId = requireBusinessId(user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        const { searchParams } = new URL(req.url);
        const vehicleId = searchParams.get("id");
        if (!vehicleId) {
            return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 });
        }

        await dbConnect();

        if (!businessId) {
            throw new Error("Tenant context lost before database operation");
        }

        const result = await BusinessVehicle.findOneAndDelete({ _id: vehicleId, businessId });
        if (!result) {
            return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
        }

        return NextResponse.json({
            data: null,
            meta: {
                message: "Vehicle deleted successfully",
                businessId,
                timestamp: new Date().toISOString()
            }
        }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        return NextResponse.json({
            data: null,
            meta: {
                error: "Failed to delete vehicle",
                details: error.message,
                timestamp: new Date().toISOString()
            }
        }, { status: 500 });
    }
}
