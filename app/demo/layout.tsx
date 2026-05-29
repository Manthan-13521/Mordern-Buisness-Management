import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Demo | AquaSync SaaS",
  description: "Schedule a personalized demo of AquaSync for your swimming pool, hostel, or business.",
  alternates: {
    canonical: "https://aquasync.com/demo",
  },
  openGraph: {
    title: "Book a Demo | AquaSync SaaS",
    description: "Schedule a personalized demo of AquaSync for your swimming pool, hostel, or business.",
  }
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
