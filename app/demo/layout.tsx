import { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aquasync.in";

export const metadata: Metadata = {
  title: "Book a Demo — See AquaSync Pool, Hostel & Business Software in Action",
  description:
    "Schedule a personalized live demo of AquaSync. See how pool management, hostel management, and business management software works for your specific use case.",
  alternates: {
    canonical: `${appUrl}/demo`,
  },
  openGraph: {
    title: "Book a Demo — AquaSync Pool, Hostel & Business Management Software",
    description:
      "Get a personalized demo of AquaSync. See how pools, hostels, and businesses automate operations from one dashboard.",
    url: `${appUrl}/demo`,
    siteName: "AquaSync",
    locale: "en_IN",
    images: [
      {
        url: `${appUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "AquaSync Demo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Book a Demo — AquaSync",
    description: "See AquaSync in action. Book a free personalized demo today.",
    images: [`${appUrl}/opengraph-image`],
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
