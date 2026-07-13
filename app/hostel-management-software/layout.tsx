import { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aquasync.in";
const pageUrl = `${appUrl}/hostel-management-software`;

export const metadata: Metadata = {
  title: "Hostel Management Software India | PG Management ERP | AquaSync",
  description:
    "AquaSync is India's leading hostel management software. Automate room allocation, track student ledgers, send WhatsApp rent reminders, and manage staff attendance from one dashboard.",
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: "Hostel Management Software & PG ERP India | AquaSync",
    description:
      "Automate your hostel operations with AquaSync. Room allocation, WhatsApp rent tracking, and occupancy analytics built for Indian PGs and hostels.",
    url: pageUrl,
    siteName: "AquaSync",
    locale: "en_IN",
    images: [
      {
        url: `${appUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "AquaSync Hostel Management Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hostel Management Software & PG ERP India | AquaSync",
    description: "Room allocation, WhatsApp rent tracking, and occupancy analytics for hostels.",
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
      name: "Hostel Management Software",
      item: pageUrl,
    },
  ],
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AquaSync Hostel ERP",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  url: pageUrl,
  description:
    "Comprehensive cloud-based hostel and PG management software designed for India. Features include room and bed allocation, automated WhatsApp rent reminders, student digital ledgers, and staff management.",
  offers: [
    {
      "@type": "Offer",
      name: "Hostel Management — 1 Block Yearly",
      price: "5999",
      priceCurrency: "INR",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/InStock",
    },
  ],
  featureList: [
    "Room and Bed Allocation System",
    "Automated WhatsApp Rent Reminders",
    "Digital Student Ledger",
    "Occupancy & Vacancy Tracking",
    "Revenue Analytics Dashboard",
    "Staff Salary & Advance Tracking",
  ],
  screenshot: `${appUrl}/opengraph-image`,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does the room and bed allocation work in AquaSync?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AquaSync provides a visual representation of your hostel blocks, floors, and rooms. You can define the exact capacity of each room. When admitting a student, you simply select an available bed. The system automatically updates the occupancy status, ensuring you never double-book a bed and always have a real-time view of vacancies.",
      },
    },
    {
      "@type": "Question",
      name: "Can I automatically send monthly rent reminders to students?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, this is one of our most powerful features. The system automatically calculates the monthly rent due dates for each student and sends personalized WhatsApp messages reminding them to pay. It completely eliminates the awkwardness and manual effort of chasing students for rent.",
      },
    },
    {
      "@type": "Question",
      name: "Does it track partial payments and pending dues?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. Each student has a digital ledger. If a student pays only a portion of their rent, the system logs the exact amount paid and automatically carries over the pending balance to the next cycle. You can view a consolidated report of all pending dues across the entire hostel with one click.",
      },
    },
  ],
};

export default function HostelSoftwareLayout({ children }: { children: React.ReactNode }) {
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
