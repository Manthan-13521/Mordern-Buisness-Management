import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | AquaSync SaaS",
  description: "Our policies concerning refunds and subscription cancellations.",
};

export default function RefundPolicy() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-24 sm:py-32 w-full">
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-blue-600 dark:text-blue-500">Refund & Cancellation Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>
        
        <div className="prose prose-blue dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-gray-600 dark:prose-p:text-gray-300">
          <h2>1. Cancellation Rules</h2>
          <p>
            You can cancel your AquaSync SaaS subscription at any time from your billing portal. Once cancelled, your subscription will not renew, and you will retain access to the platform until the end of your current paid billing cycle. 
          </p>

          <h2>2. Refund Eligibility</h2>
          <p>
            Due to the nature of SaaS infrastructure costs and server deployments, our refund policy follows strict standard industry practices. <strong>No refunds are provided after service activation.</strong> All subscription charges are final upon successful transaction.
          </p>
          <p>
            Exceptions may only occur if there is a documented double-charge error caused exclusively by our integrated payment gateway.
          </p>

          <h2>3. Setup and Processing Timelines</h2>
          <p>
            Any agreed-upon custom onboarding or data migration fees are strictly non-refundable once the setup process has been initiated. In cases where an erroneous charge qualifies for a refund, processing timelines may take 5–10 business days depending on the financial institution.
          </p>

          <h2>4. Upgrades and Downgrades</h2>
          <p>
            If you upgrade your plan, the prorated amount will be charged immediately. If you downgrade, the new rate takes effect at the next renewal cycle, and no partial refunds will be given for the active period.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
