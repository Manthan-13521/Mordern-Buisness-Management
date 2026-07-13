import { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aquasync.in";
const pageUrl = `${appUrl}/business-management-software`;

export const metadata: Metadata = {
  title: "Business Management Software India | Inventory & Billing | AquaSync",
  description:
    "Scale your business with AquaSync. Comprehensive software for inventory tracking, sales invoicing, customer ledgers, and labour attendance. Designed for Indian SMBs.",
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: "Business Management Software India | Inventory & Billing | AquaSync",
    description:
      "Comprehensive cloud software for inventory tracking, sales invoicing, customer ledgers, and labour attendance. Designed for Indian small and medium businesses.",
    url: pageUrl,
    siteName: "AquaSync",
    locale: "en_IN",
    images: [
      {
        url: `${appUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "AquaSync Business Management Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Business Management Software India | Inventory & Billing | AquaSync",
    description: "Inventory tracking, sales invoicing, and labour management in one cloud dashboard.",
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
      name: "Business Management Software",
      item: pageUrl,
    },
  ],
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AquaSync Business Suite",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  url: pageUrl,
  description:
    "All-in-one cloud business management software for Indian SMEs. Includes inventory tracking, sales invoicing, customer digital ledgers, and labour attendance management.",
  offers: [
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
    "Real-time Inventory Tracking",
    "Sales Invoice Generation",
    "Customer Outstanding Ledgers",
    "Labour Attendance & Advance Salary",
    "Expense Management",
    "Revenue Analytics Dashboard",
  ],
  screenshot: `${appUrl}/opengraph-image`,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does the inventory management module track stock?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AquaSync maintains a real-time digital ledger of all your stock items. When you record a sale, the corresponding items are automatically deducted from your inventory. When you record a purchase, stock is added. You can view current stock levels, low-stock alerts, and historical movement across all your items instantly.",
      },
    },
    {
      "@type": "Question",
      name: "Can I manage credit customers and pending payments?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, our customer ledger is built exactly for this. When generating a sales invoice, you can record it as a 'Credit Sale'. The system logs the outstanding amount against that specific customer. You can view individual customer statements, total outstanding balances across the business, and record partial payments easily.",
      },
    },
    {
      "@type": "Question",
      name: "Does the software track daily labour attendance?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. The labour module allows you to mark daily attendance (Present, Half-Day, Absent) for all your staff. It automatically calculates monthly payouts based on their attendance and deducts any salary advances you have given them, generating a clean final settlement report.",
      },
    },
  ],
};

export default function BusinessSoftwareLayout({ children }: { children: React.ReactNode }) {
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
