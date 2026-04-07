import {
    S3Client,
    PutObjectCommand,
    ListObjectsV2Command,
    GetObjectCommand,
    HeadObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "missing",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "missing",
    },
});

const BUCKET = process.env.AWS_S3_BUCKET_NAME || "";

/**
 * Uploads a buffer to S3
 */
export async function uploadBackup(buffer: Buffer, key: string, contentType: string) {
    if (!BUCKET) throw new Error("AWS_S3_BUCKET_NAME is not configured");
    await s3Client.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        })
    );
    return key;
}

/**
 * Checks if a backup with the given prefix already exists (e.g., to prevent multiple backups per day)
 */
export async function checkBackupExists(prefix: string): Promise<boolean> {
    if (!BUCKET) return false;
    try {
        const res = await s3Client.send(
            new ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix: prefix,
                MaxKeys: 1,
            })
        );
        return (res.KeyCount ?? 0) > 0;
    } catch {
        return false; // Fail gracefully if no bucket/credentials
    }
}

/**
 * Lists all backups for a specific pool
 */
export async function listBackups(poolId: string) {
    if (!BUCKET) return [];
    try {
        const prefix = `backups/${poolId}/`;
        const res = await s3Client.send(
            new ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix: prefix,
            })
        );
        
        if (!res.Contents) return [];
        
        return res.Contents.map((obj) => ({
            key: obj.Key!,
            fileName: obj.Key!.split("/").pop(),
            size: obj.Size!,
            lastModified: obj.LastModified!,
            storageClass: obj.StorageClass || "STANDARD",
        })).sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    } catch (e) {
        throw new Error("Failed to list backups: " + String(e));
    }
}

/**
 * Fetches the object stream from S3. 
 * Checks if the object is in Glacier and whether it has been restored yet.
 */
export async function downloadBackup(key: string) {
    if (!BUCKET) throw new Error("AWS_S3_BUCKET_NAME is not configured");
    
    // Check storage class first to catch Glacier items
    const head = await s3Client.send(
        new HeadObjectCommand({ Bucket: BUCKET, Key: key })
    );

    if (head.StorageClass === "GLACIER" || head.StorageClass === "DEEP_ARCHIVE") {
        // If it's in Glacier, it must have a Restore header indicating it is ready
        if (!head.Restore || !head.Restore.includes('ongoing-request="false"')) {
            throw new Error("GLACIER_RESTORE_REQUIRED");
        }
    }

    const res = await s3Client.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: key })
    );

    return {
        stream: res.Body,
        contentType: res.ContentType,
    };
}

/**
 * Safely deletes an object from S3.
 */
export async function deleteS3Object(key: string) {
    if (!BUCKET || !key) return false;
    
    // Extract key if a full URL was passed
    let objectKey = key;
    if (key.includes(".amazonaws.com/")) {
        const parts = key.split(".amazonaws.com/");
        if (parts.length === 2) objectKey = parts[1];
    } else if (key.startsWith("https://") && key.includes(BUCKET)) {
        const baseUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
        if (key.startsWith(baseUrl)) {
            objectKey = key.slice(baseUrl.length);
        }
    }

    try {
        await s3Client.send(
            new DeleteObjectCommand({ Bucket: BUCKET, Key: objectKey })
        );
        return true;
    } catch (e) {
        console.error("Failed to delete S3 object:", e);
        return false;
    }
}
