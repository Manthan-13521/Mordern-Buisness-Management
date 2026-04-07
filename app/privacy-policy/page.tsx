import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | AquaSync SaaS",
  description: "Privacy Policy for AquaSync SaaS operations and data handling.",
};

export default function PrivacyPolicy() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-24 sm:py-32 w-full">
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-blue-600 dark:text-blue-500">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8 aspect-auto">Last updated: {lastUpdated}</p>
        
        <div className="prose prose-blue dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-gray-600 dark:prose-p:text-gray-300">
          <h2>1. Information We Collect</h2>
          <p>
            When you register an account or use our platform, we collect personal information such as your name, phone number, and email address. 
            For hostel and pool members added by administrators, similar identifying data is securely stored.
          </p>
          
          <h2>2. How We Use Your Information</h2>
          <p>
            The data collected is exclusively used to power the features of the AquaSync SaaS platform. This includes tracking memberships, sending automated renewal reminders, and maintaining operational security. <strong>We do not sell user data</strong> under any circumstances.
          </p>

          <h2>3. Cookies and Tracking</h2>
          <p>
            We use strictly necessary cookies to keep you signed in, to analyze site traffic, and to optimize the performance of our dashboard.
          </p>

          <h2>4. Third-Party Services</h2>
          <p>
            We rely on trusted third-party providers for specific functionalities:
          </p>
          <ul>
            <li><strong>Twilio:</strong> Used explicitly for sending essential SMS alerts such as payment links and expiry notices.</li>
            <li><strong>AWS (Amazon Web Services):</strong> Used for scalable cloud hosting and secure, encrypted database storage for all member data and files.</li>
          </ul>

          <h2>5. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data. However, no electronic storage system is completely secure, and we cannot guarantee absolute security over the data transmitted to our servers.
          </p>

          <h2>6. Contact Information</h2>
          <p>
            If you have any questions regarding this Privacy Policy, please contact us at: <br/>
            <strong>manthanjaiswal902@gmail.com</strong><br/>
            <strong>+91 8125629601</strong><br/>
            India
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
