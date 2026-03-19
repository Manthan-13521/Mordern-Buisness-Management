import fs from "fs/promises";
import path from "path";

/**
 * Saves a base64 encoded image to the local public directory.
 * @param base64Data The base64 source string
 * @param folder The subfolder inside public/uploads/ (e.g. 'photos')
 * @param filename The desired filename without extension
 * @returns The public URL path (e.g. '/uploads/photos/filename.jpg')
 */
export async function uploadBase64Image(base64Data: string, folder: string, filename: string): Promise<string> {
    try {
        const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Content, "base64");
        
        // Define directory: <project_root>/public/uploads/<folder>
        // Note: keeping "swimming-pool/photos" structure from before, we just append it
        const safeFolder = folder.replace("swimming-pool/", ""); // strip prefix to keep it clean if needed
        const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);
        
        await fs.mkdir(uploadDir, { recursive: true });
        
        const filePath = path.join(uploadDir, `${filename}.jpg`);
        await fs.writeFile(filePath, buffer);
        
        // Return URL relative to /public
        return `/uploads/${safeFolder}/${filename}.jpg`;
    } catch (error) {
        console.error("Local base64 upload failed:", error);
        throw error;
    }
}

/**
 * Saves a raw Buffer to the local public directory.
 */
export async function uploadBuffer(buffer: Buffer, folder: string, filename: string): Promise<string> {
    try {
        const safeFolder = folder.replace("swimming-pool/", "");
        const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);
        
        await fs.mkdir(uploadDir, { recursive: true });
        
        const filePath = path.join(uploadDir, `${filename}.png`); // mostly used for QR
        await fs.writeFile(filePath, buffer);
        
        return `/uploads/${safeFolder}/${filename}.png`;
    } catch (error) {
        console.error("Local buffer upload failed:", error);
        throw error;
    }
}
