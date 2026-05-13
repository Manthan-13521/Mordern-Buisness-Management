import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { logger } from "@/lib/logger";

// Allow up to 8MB request bodies (5MB file → ~6.7MB base64 + JSON overhead)
export const config = {
    api: {
        bodyParser: {
            sizeLimit: "8mb",
        },
    },
};

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
        logger.error("Upload error", { error: error?.message });
        return NextResponse.json({ error: "Upload failed", details: error.message }, { status: 500 });
    }
}
