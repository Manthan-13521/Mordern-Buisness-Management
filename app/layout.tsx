import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Toaster } from "react-hot-toast";
import { LocalDBInitializer } from "@/components/LocalDBInitializer";
import TrialBanner from "@/components/ui/quota/TrialBanner";
import QuotaWarningModal from "@/components/ui/quota/QuotaWarningModal";

const inter = Inter({ subsets: ["latin"] });

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aquasync.in";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "AquaSync — Pool, Hostel & Business Management Software",
    template: "%s | AquaSync",
  },
  description:
    "AquaSync is an all-in-one cloud SaaS platform for swimming pool management, hostel management, and business management. Automate payments, members, inventory, staff, and analytics from one unified dashboard.",
  keywords: [
    "swimming pool management software",
    "hostel management software",
    "business management software",
    "pool membership software",
    "hostel ERP India",
    "inventory management software India",
    "billing software small business",
    "QR code pool entry",
    "WhatsApp rent reminders",
    "SaaS India",
  ],
  authors: [{ name: "AquaSync", url: appUrl }],
  creator: "AquaSync",
  publisher: "AquaSync",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: appUrl,
    siteName: "AquaSync",
    title: "AquaSync — Pool, Hostel & Business Management Software",
    description:
      "All-in-one SaaS platform for swimming pools, hostels, and businesses. Payments, members, inventory, staff automation — one dashboard.",
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
    title: "AquaSync — Pool, Hostel & Business Management Software",
    description:
      "All-in-one SaaS for swimming pools, hostels, and businesses. Automate payments, members, inventory, and staff.",
    images: [`${appUrl}/opengraph-image`],
    creator: "@aquasync",
  },
  alternates: {
    canonical: appUrl,
  },
  verification: {
    // Add your Google Search Console verification token below after setting up GSC
    // google: "YOUR_GSC_VERIFICATION_TOKEN",
    // bing: "YOUR_BING_VERIFICATION_TOKEN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-background`}>
        <Providers>
          <LocalDBInitializer />
          <TrialBanner />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className:
                "dark:bg-[#0f172a] dark:text-white dark:border dark:border-white/10",
            }}
          />
          <QuotaWarningModal />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
