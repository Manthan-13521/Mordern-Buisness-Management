import { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aquasync.in";

export const metadata: Metadata = {
  title: "Blog & Resources | AquaSync SaaS",
  description:
    "Expert insights, guides, and best practices for managing swimming pools, hostels, and small businesses in India.",
  alternates: {
    canonical: `${appUrl}/blog`,
  },
  openGraph: {
    title: "Blog & Resources | AquaSync SaaS",
    description: "Expert insights, guides, and best practices for managing swimming pools, hostels, and small businesses in India.",
    url: `${appUrl}/blog`,
    siteName: "AquaSync",
    locale: "en_IN",
    images: [
      {
        url: `${appUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "AquaSync Blog",
      },
    ],
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
