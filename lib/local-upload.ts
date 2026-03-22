import { uploadToCloudinary } from "./cloudinary";

/**
 * Saves a base64 encoded image to Cloudinary.
 * @param base64Data The base64 source string
 * @param folder The subfolder inside Cloudinary (e.g. 'photos')
 * @param filename The desired filename without extension
 * @returns The secure Cloudinary URL
 */
export async function uploadBase64Image(base64Data: string, folder: string, filename: string): Promise<string> {
    try {
        // Cloudinary handles base64 if it has the data prefix
        const base64ForCloudinary = base64Data.startsWith("data:") 
            ? base64Data 
            : `data:image/jpeg;base64,${base64Data}`;

        return await uploadToCloudinary(base64ForCloudinary, folder, filename);
    } catch (error) {
        console.error("Cloudinary base64 upload failed:", error);
        throw error;
    }
}

/**
 * Saves a raw Buffer to Cloudinary.
 */
export async function uploadBuffer(buffer: Buffer, folder: string, filename: string): Promise<string> {
    try {
        return await uploadToCloudinary(buffer, folder, filename);
    } catch (error) {
        console.error("Cloudinary buffer upload failed:", error);
        throw error;
    }
}
