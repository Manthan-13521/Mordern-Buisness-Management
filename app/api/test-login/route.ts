import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { SignJWT } from "jose";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        // 🔐 Secure access using secret (works in production too)
        const testSecret = req.headers.get("x-test-secret");

        if (!testSecret || testSecret !== process.env.TEST_SECRET) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        await dbConnect();

        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        const user = await User.findOne({ email }).lean();

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const secret = process.env.JWT_SECRET;

        if (!secret) {
            return NextResponse.json(
                { error: "JWT_SECRET is not configured" },
                { status: 500 }
            );
        }

        const encodedSecret = new TextEncoder().encode(secret);

        const token = await new SignJWT({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            poolId: user.poolId,
            poolSlug: user.poolSlug,
            poolName: user.poolName,
            hostelId: user.hostelId,
            hostelSlug: user.hostelSlug,
            hostelName: user.hostelName,
            businessId: user.businessId,
            businessSlug: user.businessSlug,
            businessName: user.businessName,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("1h")
            .sign(encodedSecret);

        return NextResponse.json({ token });

    } catch (error) {
        console.error("[POST /api/test-login]", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}