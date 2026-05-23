import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

const MAX_BASE64_SIZE = 22 * 1024 * 1024; // ~22MB file (for up to 20MB payload)
const ALLOWED_MIME_PREFIXES = [
    "data:image/png",
    "data:image/jpeg",
    "data:image/jpg",
    "data:image/webp",
    "data:image/gif",
    "data:video/mp4",
    "data:video/webm",
];

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

        // Enforce maximum file size
        if (file.length > MAX_BASE64_SIZE) {
            return NextResponse.json({ error: "File too large. Maximum size is 20MB." }, { status: 413 });
        }

        // Validate MIME type
        if (file.startsWith("data:")) {
            const isAllowed = ALLOWED_MIME_PREFIXES.some(prefix => file.startsWith(prefix));
            if (!isAllowed) {
                return NextResponse.json({ error: "File type not allowed. Only JPG, PNG, WebP, GIF, MP4, and WebM are accepted." }, { status: 400 });
            }
        }

        console.log("[Superadmin Upload] Uploading file to Cloudinary...");
        const secureUrl = await uploadToCloudinary(file, "superadmin/ads");
        console.log("[Superadmin Upload] Cloudinary upload successful:", secureUrl);

        return NextResponse.json({ url: secureUrl });
    } catch (error: any) {
        console.error("[Superadmin Upload] Error during upload process:", error);
        return NextResponse.json({ error: "Upload failed", details: error.message }, { status: 500 });
    }
}

