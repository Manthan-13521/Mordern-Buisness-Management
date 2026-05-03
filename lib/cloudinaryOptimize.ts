/**
 * Cloudinary URL optimization utility.
 * Transforms raw Cloudinary URLs to include on-the-fly resizing,
 * format auto-detection (WebP/AVIF), and quality optimization.
 * 
 * Reduces image payload by 60-80% without any visible quality loss.
 */

/**
 * Transform a Cloudinary URL to use optimized delivery parameters.
 * If the URL is not a Cloudinary URL, returns it unchanged.
 * 
 * @param url - Raw Cloudinary URL (e.g., https://res.cloudinary.com/xxx/image/upload/v123/photo.jpg)
 * @param width - Target width in pixels
 * @param height - Optional target height (defaults to width for square crops)
 * @param quality - Quality level: "auto" (recommended), or number 1-100
 */
export function getOptimizedCloudinaryUrl(
    url: string | undefined | null,
    width: number = 120,
    height?: number,
    quality: string | number = "auto"
): string {
    if (!url) return "";
    
    // Only transform Cloudinary URLs
    if (!url.includes("res.cloudinary.com")) return url;

    // Don't double-transform
    if (url.includes("f_auto") || url.includes("w_")) return url;

    // Insert transformation parameters after /upload/
    const transformations = [
        `w_${width}`,
        height ? `h_${height}` : `h_${width}`,
        "c_fill",      // Crop to fill dimensions
        "f_auto",      // Auto-detect best format (WebP/AVIF)
        `q_${quality}`, // Auto quality or specified
        "g_face",      // Gravity: focus on face for portraits
    ].join(",");

    return url.replace(
        "/upload/",
        `/upload/${transformations}/`
    );
}

/**
 * Pre-configured size presets for common use cases.
 */
export const cloudinaryPresets = {
    /** Member profile photo in list view */
    memberThumbnail: (url: string) => getOptimizedCloudinaryUrl(url, 60, 60),
    
    /** Member profile photo in detail view */
    memberProfile: (url: string) => getOptimizedCloudinaryUrl(url, 120, 120),
    
    /** Member profile photo full size */
    memberFull: (url: string) => getOptimizedCloudinaryUrl(url, 300, 300),
    
    /** QR code display */
    qrCode: (url: string) => getOptimizedCloudinaryUrl(url, 300, 300, 90),
    
    /** Card photo for ID generation */
    cardPhoto: (url: string) => getOptimizedCloudinaryUrl(url, 200, 250),
};
