import { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aquasync.in";
const pageUrl = `${appUrl}/swimming-pool-management-software`;

export const metadata: Metadata = {
  title: "Swimming Pool Management Software India | AquaSync SaaS",
  description:
    "Automate your swimming pool operations with AquaSync. Features include QR code access control, member expiry tracking, revenue analytics, and WhatsApp payment reminders. Built for Indian businesses.",
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: "Swimming Pool Management Software India | AquaSync SaaS",
    description:
      "Automate your swimming pool operations with AquaSync. QR access control, member tracking, and revenue analytics all in one cloud dashboard.",
    url: pageUrl,
    siteName: "AquaSync",
    locale: "en_IN",
    images: [
      {
        url: `${appUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "AquaSync Swimming Pool Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Swimming Pool Management Software India | AquaSync SaaS",
    description: "QR access control, member tracking, and revenue analytics for swimming pools.",
    images: [`${appUrl}/opengraph-image`],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: appUrl,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Swimming Pool Management Software",
      item: pageUrl,
    },
  ],
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AquaSync Pool Management",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  url: pageUrl,
  description:
    "Cloud-based swimming pool management software offering QR code entry systems, membership tracking, automated WhatsApp payment reminders, and real-time revenue analytics.",
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
  ],
  featureList: [
    "QR Code Access Control System",
    "Automated Membership Expiry Alerts",
    "WhatsApp Payment Reminders",
    "Real-time Occupancy Tracking",
    "Revenue Analytics Dashboard",
    "Staff Attendance Tracking",
  ],
  screenshot: `${appUrl}/opengraph-image`,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does the QR code entry system work for swimming pools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AquaSync generates a unique digital QR ID card for every active member. When members scan their QR code at your pool's reception, the system instantly verifies their membership status. If their subscription is expired, the system alerts your staff and denies entry, completely eliminating revenue leakage from unauthorized access.",
      },
    },
    {
      "@type": "Question",
      name: "Can I send automated payment reminders to members?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Our software integrates directly with WhatsApp to automatically send payment reminders to members before their subscription expires. It also sends instant confirmation receipts when a payment is recorded, ensuring professional communication with zero manual effort.",
      },
    },
    {
      "@type": "Question",
      name: "Does it track daily occupancy and attendance?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. The dashboard provides real-time occupancy tracking. You can see exactly how many members checked in today, peak hours of operation, and historical attendance trends to better manage staff shifts and pool maintenance schedules.",
      },
    },
  ],
};

export default function PoolSoftwareLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
