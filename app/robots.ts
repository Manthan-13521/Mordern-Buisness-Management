import type { MetadataRoute } from "next";

/**
 * robots.ts — Next.js Metadata API
 * Explicitly allows all public marketing pages.
 * Blocks crawlers from admin dashboards, API routes, and tenant app routes.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aquasync.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/contact",
          "/blog",
          "/blog/",
          "/demo",
          "/faq",
          "/login",
          "/select-plan",
          "/trust",
          "/swimming-pool-management-software",
          "/hostel-management-software",
          "/business-management-software",
          "/privacy-policy",
          "/terms",
          "/refund-policy",
          "/subscription-policy",
          "/data-retention-policy",
          "/security-policy",
          "/acceptable-use-policy",
          "/support-policy",
          "/races",
          "/member-portal",
        ],
        disallow: [
          "/api/",
          "/superadmin/",
          "/pool/",
          "/hostel/",
          "/business/",
          "/dashboard/",
          "/settings/",
          "/admin/",
          "/recycle-bin",
          "/renew-plan",
          "/subscribe",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
