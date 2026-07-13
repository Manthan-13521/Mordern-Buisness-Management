import { ImageResponse } from "next/og";

/**
 * app/opengraph-image.tsx — Dynamic Open Graph image (Next.js App Router)
 * Rendered on-demand via Next.js ImageResponse API (Vercel Edge).
 * Automatically served at /opengraph-image and referenced by all OG tags.
 *
 * Dimensions: 1200×630 (standard OG spec)
 * Format: PNG (auto-served by Next.js)
 */

export const runtime = "edge";
export const alt = "AquaSync — Pool, Hostel & Business Management Software";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #020617 0%, #0a1628 50%, #020617 100%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif",
        }}
      >
        {/* Background grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "64px 80px",
            gap: "24px",
            zIndex: 10,
            flex: 1,
          }}
        >
          {/* Logo row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
              }}
            >
              〜
            </div>
            <span
              style={{
                color: "#ffffff",
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "-0.5px",
              }}
            >
              AquaSync
            </span>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: "54px",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-1.5px",
              color: "#ffffff",
              maxWidth: "820px",
            }}
          >
            Pool, Hostel &amp; Business{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Management Software
            </span>
          </div>

          {/* Subheadline */}
          <div
            style={{
              fontSize: "22px",
              color: "#9ca3af",
              fontWeight: 400,
              maxWidth: "700px",
              lineHeight: 1.5,
            }}
          >
            All-in-one cloud SaaS for Indian businesses. Automate payments,
            members, inventory &amp; staff.
          </div>

          {/* Module badges */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "12px",
            }}
          >
            {[
              { label: "🏊 Pool Management", color: "#3b82f6" },
              { label: "🏠 Hostel Management", color: "#8b5cf6" },
              { label: "💼 Business Suite", color: "#10b981" },
            ].map((badge) => (
              <div
                key={badge.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 20px",
                  borderRadius: "100px",
                  border: `1px solid ${badge.color}40`,
                  background: `${badge.color}15`,
                  color: badge.color,
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                {badge.label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 80px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            zIndex: 10,
          }}
        >
          <span style={{ color: "#6b7280", fontSize: "16px" }}>
            aquasync.in
          </span>
          <span
            style={{
              color: "#3b82f6",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            Starting at ₹1,999/quarter →
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
