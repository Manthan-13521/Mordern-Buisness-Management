import { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aquasync.in";

export const metadata: Metadata = {
  title: "Contact Us | AquaSync Support & Sales",
  description:
    "Get in touch with the AquaSync team. We are here to help you automate your business. Contact us for sales inquiries, technical support, or partnership opportunities.",
  alternates: {
    canonical: `${appUrl}/contact`,
  },
};

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  mainEntity: {
    "@type": "Organization",
    name: "AquaSync",
    url: appUrl,
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+91-8125629601",
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["en", "hi"]
      },
      {
        "@type": "ContactPoint",
        email: "manthanjaiswal902@gmail.com",
        contactType: "sales"
      }
    ]
  }
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />
      {children}
    </>
  );
}
