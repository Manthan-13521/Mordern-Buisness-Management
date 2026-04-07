import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import RazorpayScript from "@/components/RazorpayScript";
import { Toaster } from "react-hot-toast";
import { LocalDBInitializer } from "@/components/LocalDBInitializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TS Pools Management System",
  description: "Next Generation Swimming Pool Management",
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
        <RazorpayScript />
      </body>
    </html>
  );
}
