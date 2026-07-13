import { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aquasync.in";

export const metadata: Metadata = {
  title: "Frequently Asked Questions — AquaSync Pool, Hostel & Business Software",
  description:
    "Get answers to the most common questions about AquaSync — data safety, subscription billing, refund policy, WhatsApp automation, and support response times.",
  alternates: {
    canonical: `${appUrl}/faq`,
  },
  openGraph: {
    title: "FAQ — AquaSync Pool, Hostel & Business Management Software",
    description:
      "Answers to common questions about AquaSync including billing, data safety, support, and platform features.",
    url: `${appUrl}/faq`,
    siteName: "AquaSync",
    locale: "en_IN",
    images: [
      {
        url: `${appUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "AquaSync FAQ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ — AquaSync",
    description: "Answers to common questions about AquaSync.",
    images: [`${appUrl}/opengraph-image`],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is my business data safe on AquaSync?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. All data is encrypted in transit via HTTPS/TLS, stored on secure cloud infrastructure with strict tenant isolation, and backed up regularly. Your data is logically separated from every other customer on the platform. We never share or sell your data.",
      },
    },
    {
      "@type": "Question",
      name: "Who owns the data I put into AquaSync?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You do. All customer data — including member records, payment history, attendance logs, and analytics — remains the sole property of the customer. AquaSync does not claim any ownership rights over your business data.",
      },
    },
    {
      "@type": "Question",
      name: "What happens when my subscription expires?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "When your subscription expires, your account enters a 3-day grace period. During this time, your dashboard becomes READ-ONLY — you can still log in and view all your data, but you cannot create, update, or delete any records. After 3 days, the account is LOCKED and you will be redirected to the renewal page.",
      },
    },
    {
      "@type": "Question",
      name: "What plans are available?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AquaSync offers Monthly, Quarterly, and Yearly billing cycles. All plans include the full feature set. Longer billing cycles offer better value. You can view current pricing on our pricing page.",
      },
    },
    {
      "@type": "Question",
      name: "How quickly will I get a support response?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "All support requests receive a response within 12 hours during business hours (Mon–Sat, 9 AM – 9 PM IST), regardless of your subscription plan. This applies to Free/Trial, Quarterly, and Yearly plans equally.",
      },
    },
  ],
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
