import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Retention Policy | AquaSync SaaS",
  description: "Data retention, ownership, and deletion policies for AquaSync customers.",
  alternates: {
    canonical: "https://aquasync.in/data-retention-policy",
  },
  openGraph: {
    title: "Data Retention Policy | AquaSync SaaS",
    description: "Data retention, ownership, and deletion policies for AquaSync customers.",
  }
};

export default function DataRetentionPolicy() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-24 sm:py-32 w-full">
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-blue-600 dark:text-blue-500">Data Retention Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>
        
        <div className="prose prose-blue dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-gray-600 dark:prose-p:text-gray-300">
          
          <h2>1. Data Ownership</h2>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-md mb-6">
            <p className="m-0 font-medium">
              <strong>All customer data remains the sole property of the customer.</strong> AquaSync explicitly does not claim ownership of any business data, member records, or financial information you input into our platform. You retain full rights and control over your proprietary information.
            </p>
          </div>

          <h2>2. Retention Based on Account Status</h2>
          <p>
            How long we retain your data and how you can access it depends entirely on your subscription status:
          </p>

          <h3>Active Customers</h3>
          <p>
            While your subscription is active and in good standing, your data is retained normally and backed up regularly according to our internal security protocols to prevent data loss. You have full read, write, and export capabilities.
          </p>

          <h3>Expired Customers (3-Day Grace Period)</h3>
          <p>
            Upon subscription expiration, your account enters a 3-day grace period. Your data remains completely intact and accessible, but the application is placed in a <strong>READ-ONLY</strong> mode. During this time, you can view your data and initiate exports, but you cannot modify existing records or add new ones.
          </p>

          <h3>Locked Customers</h3>
          <p>
            After the 3-day grace period, if the subscription remains unpaid, the account is <strong>LOCKED</strong>. Access to the dashboard and all underlying data is immediately removed from the user interface. However, the data is <strong>not immediately deleted</strong>. We securely archive the data to allow for seamless reactivation if you choose to renew your subscription.
          </p>

          <h2>3. Permanent Deletion Policy</h2>
          <p>
            For locked accounts, data is retained in a dormant state for a minimum of <strong>90 days</strong> following the lock date. After this 90-day period, AquaSync reserves the right to permanently purge the tenant data from our active databases and subsequent backups. 
          </p>
          <p>
            If you wish to have your data permanently deleted prior to the 90-day threshold, you may submit a formal Data Deletion Request to our support team from the email address associated with the account owner.
          </p>

          <h2>4. Data Export Rights</h2>
          <p>
            Customers in the ACTIVE or EXPIRED (Grace Period) states have the right to export their critical business data. Export functionality is available within the admin portal. Once an account transitions to the LOCKED state, self-service exports are disabled. If you require a data export while in the LOCKED state, you must contact support, and an administrative fee may apply.
          </p>

          <h2>5. Backup Handling</h2>
          <p>
            AquaSync maintains automated backups for disaster recovery purposes. When data is permanently deleted from our active production systems, it may reside in encrypted backup archives for an additional rolling period (typically up to 30 days) before being irrevocably overwritten.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
