import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { getServerSession } from "next-auth";
import { jwtVerify } from "jose";
import { authOptions } from "@/lib/auth";
import { secureFindById } from "@/lib/tenantSecurity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
                const authHeader = req.headers.get("authorization");
        let token = null;

        if (authHeader?.startsWith("Bearer ")) {
            try {
                const bearerToken = authHeader.split(" ")[1];
                const secret = new TextEncoder().encode(process.env.JWT_SECRET);
                const { payload } = await jwtVerify(bearerToken, secret);
                token = payload;
            } catch (e) {}
        }

        if (!token) {
            const session = await getServerSession(authOptions);
        token = session?.user || null;
        }

        await dbConnect();

        const session = { user: token }; // Mock session for compatibility
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;
        if (!id) return new NextResponse("Invalid ID", { status: 400 });

        await dbConnect();

        let member = await secureFindById(Member, id, session.user, { select: "+photoUrl" });
        if (!member) {
            member = await secureFindById(EntertainmentMember, id, session.user, { select: "+photoUrl" });
        }

        if (!member || !member.photoUrl) {
            return new NextResponse("Not Found", { status: 404 });
        }

        // Fetch image from Cloudinary (or wherever photoUrl points)
        const response = await fetch(member.photoUrl);
        
        if (!response.ok) {
            return new NextResponse("Image provider error", { status: response.status });
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get("content-type") || "image/jpeg";

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "private, max-age=86400", // Cache in user's browser for 1 day
                "Content-Security-Policy": "default-src 'none'; img-src 'self'",
            },
        });
    } catch (error) {
        console.error("[GET /api/members/[id]/photo]", error);
        return new NextResponse("Server Error", { status: 500 });
    }
}
