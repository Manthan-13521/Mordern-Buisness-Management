import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Toaster } from "react-hot-toast";
import { LocalDBInitializer } from "@/components/LocalDBInitializer";

const inter = Inter({ subsets: ["latin"] });

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aquasync.in";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "AquaSync — All-in-One Business Management",
    template: "%s | AquaSync",
  },
  description: "Manage swimming pools, hostels, and businesses with one powerful platform. Payments, members, analytics, and automation.",
  openGraph: {
    title: "AquaSync SaaS",
    description: "All-in-one business management platform for pools, hostels & workforce",
    url: appUrl,
    siteName: "AquaSync",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AquaSync SaaS",
    description: "All-in-one business management platform",
  },
  alternates: {
    canonical: appUrl,
  },
  robots: {
    index: true,
    follow: true,
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
          {children}
          <Toaster position="bottom-right" toastOptions={{ className: 'dark:bg-[#0f172a] dark:text-white dark:border dark:border-white/10' }} />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
