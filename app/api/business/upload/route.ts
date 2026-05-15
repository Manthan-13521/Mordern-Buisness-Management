import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { requireBusinessId } from "@/lib/tenant";
import { uploadLimiter } from "@/lib/rateLimiter";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// ── Upload Safety Constants ──
const MAX_BASE64_SIZE = 7 * 1024 * 1024; // ~5MB file → ~6.7MB base64 + overhead
const ALLOWED_MIME_PREFIXES = [
    "data:image/png",
    "data:image/jpeg",
    "data:image/jpg",
    "data:image/webp",
    "data:image/gif",
    "data:application/pdf",
];
const BLOCKED_EXTENSIONS = [".exe", ".sh", ".bat", ".cmd", ".ps1", ".dll", ".so", ".msi", ".js", ".ts", ".py", ".rb", ".php"];

export async function POST(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user || user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 🟠 RATE LIMITING
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const rl = uploadLimiter.checkTenant(user.businessId || "unknown", ip);
        if (!rl.allowed) {
            return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
        }

        let businessId: string;
        try {
            businessId = requireBusinessId(user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        const { file, folder = "receipts" } = await req.json();

        if (!file || typeof file !== "string") {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // 🔴 SIZE ENFORCEMENT: Reject oversized payloads before processing
        if (file.length > MAX_BASE64_SIZE) {
            logger.warn("Upload rejected: file too large", { businessId, size: file.length });
            return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 413 });
        }

        // 🔴 MIME VALIDATION: Only allow safe file types
        if (file.startsWith("data:")) {
            const isAllowed = ALLOWED_MIME_PREFIXES.some(prefix => file.startsWith(prefix));
            if (!isAllowed) {
                logger.warn("Upload rejected: disallowed MIME type", {
                    businessId,
                    mimePrefix: file.substring(0, 30),
                });
                return NextResponse.json({ error: "File type not allowed. Only images and PDFs are accepted." }, { status: 400 });
            }
        }

        // 🔴 EXTENSION BLOCK: Reject known dangerous extensions in folder names
        const sanitizedFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
        if (BLOCKED_EXTENSIONS.some(ext => sanitizedFolder.toLowerCase().endsWith(ext))) {
            return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
        }

        // Upload to Cloudinary (scoped to business)
        const secureUrl = await uploadToCloudinary(file, `business/${businessId}/${sanitizedFolder}`);

        return NextResponse.json({ url: secureUrl }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        logger.error("Upload error", { error: error?.message });
        return NextResponse.json({ error: "Upload failed", details: error.message }, { status: 500 });
    }
}
