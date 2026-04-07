import { Metadata } from "next";
import { Navbar } from "@/components/marketing/Navbar";
import { HeroSection } from "@/components/marketing/HeroSection";
import { TrustSection } from "@/components/marketing/TrustSection";
import { WhyAquaSync } from "@/components/marketing/WhyAquaSync";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Testimonials } from "@/components/marketing/Testimonials";
import { Footer } from "@/components/marketing/Footer";
import { FloatingCTA } from "@/components/marketing/FloatingCTA";

export const metadata: Metadata = {
  title: "AquaSync SaaS - Pool & Hostel Management Software",
  description: "Manage swimming pools and hostels with one powerful platform. Payments, members, analytics, and automation.",
  openGraph: {
    title: "AquaSync SaaS",
    description: "All-in-one business management platform",
    url: "https://yourdomain.com",
    siteName: "AquaSync",
    type: "website",
  },
};

export default function SaaSMarketingLanding() {
  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-900 dark:selection:text-blue-200">
      <Navbar />
      
      <main className="flex-1 isolate">
        <HeroSection />
        <TrustSection />
        <WhyAquaSync />
        <FeaturesSection />
        <HowItWorks />
        <Testimonials />
      </main>

      <Footer />
      <FloatingCTA />
    </div>
  );
}

