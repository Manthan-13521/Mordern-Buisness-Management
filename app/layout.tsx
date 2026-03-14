import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import RazorpayScript from "@/components/RazorpayScript";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950`}>
        <Providers>
          {children}
        </Providers>
        <RazorpayScript />
      </body>
    </html>
  );
}
