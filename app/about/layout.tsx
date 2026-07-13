import { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aquasync.in";

export const metadata: Metadata = {
  title: "About AquaSync | Our Mission & Vision",
  description:
    "Learn about AquaSync's mission to digitize and automate India's small and medium businesses. Discover our story, our team, and our commitment to security and transparency.",
  alternates: {
    canonical: `${appUrl}/about`,
  },
  openGraph: {
    title: "About AquaSync | Empowering Indian SMBs",
    description: "Discover our mission to bring enterprise-grade automation to swimming pools, hostels, and small businesses in India.",
    url: `${appUrl}/about`,
    siteName: "AquaSync",
    locale: "en_IN",
    images: [`${appUrl}/opengraph-image`],
  },
};

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  mainEntity: {
    "@type": "Organization",
    name: "AquaSync",
    url: appUrl,
    foundingDate: "2024",
    foundingLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Hyderabad",
        addressRegion: "Telangana",
        addressCountry: "IN",
      }
    }
  }
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      {children}
    </>
  );
}
