import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user || user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { file, folder = "receipts" } = await req.json();

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Upload to Cloudinary
        const secureUrl = await uploadToCloudinary(file, folder);

        return NextResponse.json({ url: secureUrl });
    } catch (error: any) {
        console.error("Upload Error:", error);
        return NextResponse.json({ error: "Upload failed", details: error.message }, { status: 500 });
    }
}
