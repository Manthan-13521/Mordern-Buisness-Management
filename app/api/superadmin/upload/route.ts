import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { file } = await req.json();

        if (!file || typeof file !== "string") {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const secureUrl = await uploadToCloudinary(file, "superadmin/ads");

        return NextResponse.json({ url: secureUrl });
    } catch (error: any) {
        return NextResponse.json({ error: "Upload failed", details: error.message }, { status: 500 });
    }
}
