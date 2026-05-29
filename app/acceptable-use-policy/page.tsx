import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | AquaSync SaaS",
  description: "Acceptable Use Policy (AUP) outlining permitted and prohibited uses of the AquaSync platform.",
  alternates: {
    canonical: "https://aquasync.com/acceptable-use-policy",
  },
  openGraph: {
    title: "Acceptable Use Policy | AquaSync SaaS",
    description: "Acceptable Use Policy (AUP) outlining permitted and prohibited uses of the AquaSync platform.",
  }
};

export default function AcceptableUsePolicy() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-24 sm:py-32 w-full">
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-blue-600 dark:text-blue-500">Acceptable Use Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>
        
        <div className="prose prose-blue dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-gray-600 dark:prose-p:text-gray-300">
          <p>
            This Acceptable Use Policy (AUP) outlines the acceptable and prohibited uses of the AquaSync SaaS platform. By using our services, you agree to comply with this policy. This policy is designed to protect us, our customers, and the internet community from irresponsible, abusive, and illegal activities.
          </p>

          <h2>1. Prohibited Activities</h2>
          <p>You may not use the AquaSync platform to engage in any of the following activities:</p>
          <ul>
            <li><strong>Illegal Activity:</strong> Any activity that violates local, state, national, or international laws or regulations.</li>
            <li><strong>Spam and Abuse:</strong> Sending unsolicited communications, promotions, advertisements, or spam. Using the platform to harass, abuse, or harm others.</li>
            <li><strong>Security Violations:</strong> Attempting to probe, scan, or test the vulnerability of the system or network or to breach security or authentication measures without proper authorization.</li>
            <li><strong>Scraping and Data Extraction:</strong> Using automated systems, bots, or software to extract data from the platform for commercial or non-commercial purposes without explicit written permission.</li>
            <li><strong>Account Sharing:</strong> Sharing user accounts, passwords, or authentication tokens among multiple individuals. Each user must have their own designated credentials.</li>
            <li><strong>Reverse Engineering:</strong> Decompiling, reverse engineering, or otherwise attempting to derive source code from the platform or any of its components.</li>
          </ul>

          <h2>2. System Abuse</h2>
          <p>
            Any action that imposes an unreasonable or disproportionately large load on our infrastructure, or interferes with the proper working of the platform, is strictly prohibited. This includes, but is not limited to, intentionally flooding the system with requests or executing resource-intensive operations designed to disrupt service.
          </p>

          <h2>3. Content Standards</h2>
          <p>
            You are solely responsible for the accuracy, legality, and appropriateness of the data you input into the AquaSync platform. You may not upload or store content that is infringing, defamatory, obscene, or otherwise objectionable.
          </p>

          <h2>4. Enforcement and Termination</h2>
          <p>
            AquaSync reserves the right, but does not assume the obligation, to monitor use of the platform. We may suspend or terminate your access to the service immediately and without notice if we determine, in our sole discretion, that you have violated this Acceptable Use Policy.
          </p>

          <h2>5. Contact Us</h2>
          <p>
            If you have questions about this Acceptable Use Policy or wish to report a violation, please contact us at <strong>manthanjaiswal902@gmail.com</strong>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
