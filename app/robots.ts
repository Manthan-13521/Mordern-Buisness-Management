import type { MetadataRoute } from "next";

/**
 * robots.ts — Next.js Metadata API
 * Blocks crawlers from admin dashboards, API routes, and internal pages.
 * Only allows public marketing/landing pages.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aquasync.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/select-plan"],
        disallow: [
          "/api/",
          "/superadmin/",
          "/pool/",
          "/hostel/",
          "/business/",
          "/dashboard/",
          "/members/",
          "/settings/",
          "/admin/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
