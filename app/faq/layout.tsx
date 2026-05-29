import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | AquaSync SaaS",
  description: "Frequently asked questions about AquaSync — data safety, subscription billing, support response times, and more.",
  alternates: {
    canonical: "https://aquasync.com/faq",
  },
  openGraph: {
    title: "FAQ | AquaSync SaaS",
    description: "Frequently asked questions about AquaSync — data safety, subscription billing, support response times, and more.",
  }
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
