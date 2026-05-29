import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription & Billing Policy | AquaSync SaaS",
  description: "Subscription and billing terms, renewal behavior, and account states for AquaSync.",
  alternates: {
    canonical: "https://aquasync.com/subscription-policy",
  },
  openGraph: {
    title: "Subscription & Billing Policy | AquaSync SaaS",
    description: "Subscription and billing terms, renewal behavior, and account states for AquaSync.",
  }
};

export default function SubscriptionPolicy() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-24 sm:py-32 w-full">
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-blue-600 dark:text-blue-500">Subscription & Billing Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>
        
        <div className="prose prose-blue dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-gray-600 dark:prose-p:text-gray-300">
          <p>
            This Subscription and Billing Policy details the operational terms of AquaSync’s subscription plans, renewal mechanisms, and the state of your account in the event of an expired or failed payment.
          </p>

          <h2>1. Plan Options & Billing Cycles</h2>
          <p>
            AquaSync offers flexible subscription plans tailored to your business needs, including <strong>Monthly, Quarterly, and Yearly</strong> billing cycles. All plans are billed in advance of the service period. You can manage your subscription directly from the Superadmin dashboard.
          </p>

          <h2>2. Auto-Renewal Behavior</h2>
          <p>
            To ensure uninterrupted service, subscriptions may be configured to auto-renew at the end of the billing cycle. If auto-renewal is enabled, your payment method on file will be charged automatically. You may cancel auto-renewal at any time prior to the renewal date via your billing settings.
          </p>

          <h2>3. Upgrades and Downgrades</h2>
          <ul>
            <li><strong>Upgrades:</strong> When upgrading your plan, the new features will be unlocked immediately. A prorated charge will be applied to your payment method for the remainder of the current billing cycle.</li>
            <li><strong>Downgrades:</strong> Downgrades take effect at the beginning of the next billing cycle. No prorated refunds are issued for downgrades during an active billing period.</li>
          </ul>

          <h2>4. Account States & Subscription Expiry</h2>
          <p>
            AquaSync utilizes a strict state-based access control system to manage subscription lifecycles and ensure data integrity.
          </p>
          
          <h3>ACTIVE</h3>
          <p>
            While your subscription is current and paid, your account is in the <strong>ACTIVE</strong> state. You have full access to all features, dashboards, and the ability to create, update, and manage your data (e.g., adding members, tracking attendance).
          </p>

          <h3>EXPIRED (3-Day Grace Period)</h3>
          <p>
            If a payment fails or a subscription expires without renewal, your account enters a <strong>3-day EXPIRED grace period</strong>. During this time:
          </p>
          <ul>
            <li>Your dashboard becomes strictly <strong>READ-ONLY</strong>.</li>
            <li>You and your staff can still log in and view existing data.</li>
            <li><strong>All create, update, and delete actions are blocked.</strong> This includes member uploads, QR scans that mutate attendance, and webhook processing.</li>
          </ul>

          <h3>LOCKED</h3>
          <p>
            After the 3-day grace period concludes without a successful renewal, your account transitions to the <strong>LOCKED</strong> state. 
          </p>
          <ul>
            <li>All access to dashboard data is restricted.</li>
            <li>Every protected route will redirect to a mandatory renewal page displaying a "Plan Expired — Renew Subscription" notice.</li>
            <li>Only billing, payment, and support pages remain accessible until the subscription is renewed.</li>
          </ul>

          <h2>5. Cancellation Rules</h2>
          <p>
            You may cancel your subscription at any time. Cancellation prevents future billing, but your account will remain in the ACTIVE state until the end of your current paid billing cycle. Please refer to our Refund Policy for information regarding non-refundable charges post-activation.
          </p>

          <h2>6. Data Ownership (Summary)</h2>
          <p>
            <strong>All customer data remains the property of the customer.</strong> AquaSync does not claim ownership of your business data. For detailed information on data retention during EXPIRED and LOCKED states, please see our <a href="/data-retention-policy">Data Retention Policy</a>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
