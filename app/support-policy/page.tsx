import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support Policy | AquaSync SaaS",
  description: "AquaSync support response commitments, contact methods, and escalation paths for pool, hostel, and business customers.",
  alternates: {
    canonical: "https://aquasync.com/support-policy",
  },
  openGraph: {
    title: "Support Policy | AquaSync SaaS",
    description: "AquaSync support response commitments, contact methods, and escalation paths.",
  }
};

export default function SupportPolicy() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-24 sm:py-32 w-full">
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-blue-600 dark:text-blue-500">Support Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>
        
        <div className="prose prose-blue dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-gray-600 dark:prose-p:text-gray-300">
          <p>
            AquaSync is committed to providing timely and effective support to all customers managing their pools, hostels, and businesses on our platform. This Support Policy outlines our response commitments, available channels, and escalation procedures.
          </p>

          <h2>1. Support Hours</h2>
          <p>
            Our support team is available <strong>Monday through Saturday, 9:00 AM to 9:00 PM IST</strong>. Requests received outside of these hours will be acknowledged on the next business day.
          </p>

          <h2>2. Response Time Commitment</h2>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-md mb-6">
            <p className="m-0 font-medium">
              <strong>All support requests receive a response within 12 hours</strong> during business hours, regardless of your subscription plan.
            </p>
          </div>
          <p>
            This applies uniformly to all customers across every plan tier — including Free/Trial, Quarterly, and Yearly subscriptions. We believe every customer deserves prompt attention.
          </p>
          <p>
            <strong>Important:</strong> Response time refers to the time it takes for our team to acknowledge your request and begin investigating the issue. It does not guarantee resolution within the same window, as complex technical issues may require additional time to diagnose and fix.
          </p>

          <h2>3. Support Channels</h2>
          <p>You can reach us through the following channels:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:manthanjaiswal902@gmail.com">manthanjaiswal902@gmail.com</a> — Our primary support channel for all inquiries.</li>
            <li><strong>Phone:</strong> +91 8125629601 — Available during support hours for urgent matters.</li>
            <li><strong>In-App Feedback:</strong> Use the built-in feedback widget within your AquaSync dashboard to report bugs, request features, or share general feedback directly from the page you are on.</li>
          </ul>

          <h2>4. Bug Reporting</h2>
          <p>
            When reporting a bug, please provide as much detail as possible to help us resolve the issue quickly:
          </p>
          <ul>
            <li>A clear description of the issue and the steps to reproduce it.</li>
            <li>The page or section of the dashboard where the issue occurred.</li>
            <li>Screenshots or screen recordings, if possible.</li>
            <li>Your business type (Pool, Hostel, or Business) and the browser you are using.</li>
          </ul>
          <p>
            You can submit bug reports through email or by using the in-app feedback widget (select &quot;Bug Report&quot; as the type).
          </p>

          <h2>5. Escalation Path</h2>
          <p>
            If you feel your issue has not been addressed within a reasonable timeframe:
          </p>
          <ol>
            <li><strong>Step 1:</strong> Reply to the existing support email thread to re-flag the issue.</li>
            <li><strong>Step 2:</strong> Contact us by phone during business hours for a direct update.</li>
            <li><strong>Step 3:</strong> For critical system-wide issues affecting your operations, email us with the subject line: <code>URGENT: [Your Issue]</code>. These are reviewed with highest priority.</li>
          </ol>

          <h2>6. What Is Supported</h2>
          <ul>
            <li>Platform functionality issues (dashboard, members, payments, analytics).</li>
            <li>Account and billing-related inquiries.</li>
            <li>Data export requests.</li>
            <li>Subscription and renewal assistance.</li>
            <li>Guidance on using AquaSync features effectively.</li>
          </ul>

          <h2>7. What Is Not Supported</h2>
          <ul>
            <li>Custom software development or bespoke feature building.</li>
            <li>Issues arising from third-party integrations not officially supported by AquaSync.</li>
            <li>Data entry or data migration services (available as a paid onboarding add-on).</li>
            <li>Hardware, networking, or local device troubleshooting.</li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
