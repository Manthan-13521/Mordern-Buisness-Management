import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | AquaSync SaaS",
  description: "Terms and conditions for utilizing the AquaSync SaaS platform.",
};

export default function TermsAndConditions() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-24 sm:py-32 w-full">
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-blue-600 dark:text-blue-500">Terms & Conditions</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>
        
        <div className="prose prose-blue dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-gray-600 dark:prose-p:text-gray-300">
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using the AquaSync SaaS platform, you agree to comply with and be bound by these Terms & Conditions. If you do not agree, do not use our services.
          </p>

          <h2>2. Service Scope</h2>
          <p>
            AquaSync provides management software for pools and hostels. The <strong>Service is provided as-is</strong> and without any warranties, express or implied. We do not guarantee uninterrupted availability of the software.
          </p>
          
          <h2>3. User Responsibilities</h2>
          <p>
            Administrators are responsible for ensuring that all data entered into the platform is accurate and that they have the legal right to input their members’ information. Passwords and API credentials must be kept strictly confidential. We reserve the right to suspend accounts immediately upon suspecting malicious activity or policy violations.
          </p>

          <h2>4. Payment Terms</h2>
          <p>
            Subscription payments for the SaaS plan are charged at the beginning of the billing cycle. If payment fails, the account functionality will be restricted after a standard grace period until dues are cleared.
          </p>

          <h2>5. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, AquaSync is not liable for indirect or consequential damages. Most importantly, <strong>we are not responsible for financial losses</strong> incurred due to software issues, missed reminders, tracking errors, or payment gateway delays. You rely strictly on the platform at your own risk.
          </p>

          <h2>6. Changes to Terms</h2>
          <p>
            We reserve the right to update these Terms at any time. Continued use of the platform constitutes agreement to the modified Terms.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
