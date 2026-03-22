import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a base64 string or a Buffer to Cloudinary.
 * @param file Base64 string (with data prefix) or Buffer
 * @param folder Cloudinary folder name
 * @param publicId Optional public ID for the file
 * @returns The secure URL of the uploaded resource
 */
export async function uploadToCloudinary(
    file: string | Buffer,
    folder: string,
    publicId?: string
): Promise<string> {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: `swimming-pool/${folder}`,
            public_id: publicId,
            overwrite: true,
            resource_type: "auto" as const,
        };

        if (typeof file === "string" && file.startsWith("data:")) {
            // Base64 upload
            cloudinary.uploader.upload(file, uploadOptions, (error, result) => {
                if (error) {
                    console.error("Cloudinary base64 upload error:", error);
                    reject(error);
                } else {
                    resolve(result!.secure_url);
                }
            });
        } else if (Buffer.isBuffer(file)) {
            // Buffer upload (useful for QR codes)
            const uploadStream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (error) {
                        console.error("Cloudinary buffer upload error:", error);
                        reject(error);
                    } else {
                        resolve(result!.secure_url);
                    }
                }
            );
            uploadStream.end(file);
        } else if (typeof file === "string") {
            // Regular string (assume path or URL if not data prefix, but we mainly use base64/buffer)
            cloudinary.uploader.upload(file, uploadOptions, (error, result) => {
                if (error) {
                    console.error("Cloudinary path upload error:", error);
                    reject(error);
                } else {
                    resolve(result!.secure_url);
                }
            });
        } else {
            reject(new Error("Invalid file type provided for Cloudinary upload"));
        }
    });
}
