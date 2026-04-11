import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: ".env.local" });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testUpload() {
    try {
        console.log("Testing Cloudinary upload with config:", {
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
        });
        
        // A simple pixel
        const base64Pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR42mP8/xwAAwAB/gx9AAAAAElFTkSuQmCC";
        
        const result = await cloudinary.uploader.upload(base64Pixel, {
            folder: "test-uploads",
        });
        
        console.log("Upload successful:", result.secure_url);
    } catch (error) {
        console.error("Upload failed:", error);
    }
}

testUpload();
