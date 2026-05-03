// @ts-nocheck — AWS SDK packages are optional dependencies
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Generate a presigned URL for direct client-to-S3 uploads.
 * The server never touches the file bytes — frontend uploads directly.
 * 
 * Usage:
 *   1. Client calls API to get presigned URL
 *   2. Client PUTs file directly to S3 using the URL
 *   3. Client sends the S3 key back to the server for association
 */

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
    if (s3Client) return s3Client;
    
    s3Client = new S3Client({
        region: process.env.AWS_REGION || "ap-south-1",
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
    });
    
    return s3Client;
}

export async function generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 300 // 5 minutes
): Promise<{ uploadUrl: string; key: string }> {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) throw new Error("AWS_S3_BUCKET not configured");

    const client = getS3Client();
    
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        // Ensure uploaded files are private by default
        ACL: undefined,
    });

    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const uploadUrl = await getSignedUrl(client, command, { expiresIn });

    return { uploadUrl, key };
}

/**
 * Generate a unique S3 key for a pool member's asset.
 * Pattern: pools/{poolId}/members/{memberId}/{timestamp}_{filename}
 */
export function generateS3Key(
    poolId: string,
    memberId: string,
    filename: string,
    folder: string = "photos"
): string {
    const ext = filename.split(".").pop() || "jpg";
    const timestamp = Date.now();
    return `pools/${poolId}/${folder}/${memberId}_${timestamp}.${ext}`;
}
