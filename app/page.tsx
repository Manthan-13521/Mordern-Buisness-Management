import { Metadata } from "next";
import { Navbar } from "@/components/marketing/Navbar";
import { HeroSection } from "@/components/marketing/HeroSection";
import { TrustSection } from "@/components/marketing/TrustSection";
import { WhyAquaSync } from "@/components/marketing/WhyAquaSync";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Testimonials } from "@/components/marketing/Testimonials";
import { Footer } from "@/components/marketing/Footer";
import { ClientOnlyComponents } from "@/components/marketing/ClientOnlyComponents";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aquasync.in";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title:
    "AquaSync — Swimming Pool, Hostel & Business Management Software India",
  description:
    "AquaSync is India's all-in-one cloud management software for swimming pools, hostels, and businesses. Automate memberships, rent tracking, inventory, invoicing, and staff attendance from one dashboard. Starting at ₹1,999/quarter.",
  keywords: [
    "swimming pool management software India",
    "hostel management software India",
    "business management software",
    "pool membership software",
    "hostel ERP India",
    "inventory management software",
    "billing software India",
    "QR code pool entry",
    "WhatsApp rent reminder",
    "student hostel management system",
  ],
  alternates: {
    canonical: appUrl,
  },
  openGraph: {
    type: "website",
    url: appUrl,
    siteName: "AquaSync",
    locale: "en_IN",
    title:
      "AquaSync — Swimming Pool, Hostel & Business Management Software India",
    description:
      "All-in-one cloud SaaS for swimming pools, hostels, and businesses. Automate payments, members, inventory, and staff. Starting at ₹1,999/quarter.",
    images: [
      {
        url: `${appUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "AquaSync — Pool, Hostel & Business Management Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "AquaSync — Swimming Pool, Hostel & Business Management Software India",
    description:
      "All-in-one cloud SaaS for pools, hostels & businesses. Automate everything from ₹1,999/quarter.",
    images: [`${appUrl}/opengraph-image`],
  },
};

// ── Phase 2: Structured Data (JSON-LD) ─────────────────────────────────────

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AquaSync",
  url: appUrl,
  logo: `${appUrl}/favicon.ico`,
  description:
    "AquaSync is an all-in-one cloud SaaS platform providing swimming pool management, hostel management, and business management software for Indian SMBs.",
  foundingLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Hyderabad",
      addressRegion: "Telangana",
      addressCountry: "IN",
    },
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-8125629601",
    contactType: "customer support",
    areaServed: "IN",
    availableLanguage: ["English", "Hindi"],
  },
  sameAs: [],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "AquaSync",
  url: appUrl,
  description:
    "Swimming pool, hostel, and business management SaaS software for India.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${appUrl}/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AquaSync",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  url: appUrl,
  description:
    "All-in-one cloud SaaS platform for swimming pool management, hostel management, and business management software in India.",
  offers: [
    {
      "@type": "Offer",
      name: "Pool Management — Quarterly Plan",
      price: "3000",
      priceCurrency: "INR",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Pool Management — Yearly Plan",
      price: "7999",
      priceCurrency: "INR",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Hostel Management — 1 Block Yearly",
      price: "5999",
      priceCurrency: "INR",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Business Management — Quarterly Plan",
      price: "1999",
      priceCurrency: "INR",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Business Management — Yearly Plan",
      price: "4999",
      priceCurrency: "INR",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/InStock",
    },
  ],
  featureList: [
    "QR Code Pool Entry System",
    "WhatsApp Payment Reminders",
    "Member Expiry Alerts",
    "Pool Occupancy Management",
    "Hostel Room & Bed Allocation",
    "Automated Rent Tracking",
    "Inventory & Stock Management",
    "Digital Customer Ledger",
    "Labour Attendance Tracking",
    "Invoice Generation",
    "Revenue Analytics Dashboard",
    "Cloud Data Backup",
  ],
  screenshot: `${appUrl}/opengraph-image`,
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "12",
    bestRating: "5",
    worstRating: "1",
  },
};

export default function SaaSMarketingLanding() {
  return (
    <>
      {/* ── Structured Data (JSON-LD) ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema),
        }}
      />

      <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-900 dark:selection:text-blue-200">
        <Navbar />

        <main className="flex-1 isolate">
          <HeroSection />
          <TrustSection />
          <WhyAquaSync />
          <FeaturesSection />
          <HowItWorks />
          <Testimonials />
        </main>

        <Footer />
        {/* SmartDemoModal + FloatingCTA — loaded client-only (ssr:false) to
            prevent hydration mismatches from localStorage / session / animations */}
        <ClientOnlyComponents />
      </div>
    </>
  );
}
