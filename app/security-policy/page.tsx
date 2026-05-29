import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security Policy | AquaSync SaaS",
  description: "Comprehensive security measures, data protection, and infrastructure overview for AquaSync.",
  alternates: {
    canonical: "https://aquasync.com/security-policy",
  },
  openGraph: {
    title: "Security Policy | AquaSync SaaS",
    description: "Comprehensive security measures, data protection, and infrastructure overview for AquaSync.",
  }
};

export default function SecurityPolicy() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-24 sm:py-32 w-full">
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-blue-600 dark:text-blue-500">Security Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>
        
        <div className="prose prose-blue dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-gray-600 dark:prose-p:text-gray-300">
          <p>
            At AquaSync, we recognize that our customers entrust us with sensitive business and operational data. Protecting that data is our highest priority. This Security Policy outlines the comprehensive technical and organizational measures we have implemented to ensure the confidentiality, integrity, and availability of your information.
          </p>

          <h2>1. Data Encryption & Transmission</h2>
          <p>
            <strong>HTTPS & TLS:</strong> All data transmitted between your browser or mobile device and our servers is encrypted in transit using industry-standard Transport Layer Security (TLS) and served strictly over HTTPS. This ensures that data cannot be intercepted or tampered with during transmission.
          </p>

          <h2>2. Authentication and Access Control</h2>
          <p>
            <strong>Password Protection:</strong> We employ strong, salted hashing algorithms to securely store user passwords. Plain-text passwords are never stored in our databases.
          </p>
          <p>
            <strong>Role-Based Access Control (RBAC):</strong> Access to data and system features is strictly governed by Role-Based Access Control. Superadmins, business owners, and staff members are only granted the permissions necessary to perform their specific roles, minimizing the risk of unauthorized data exposure or modification.
          </p>

          <h2>3. Architecture and Tenant Isolation</h2>
          <p>
            <strong>Multi-Tenant Data Isolation:</strong> AquaSync operates on a secure multi-tenant architecture. We enforce strict logical isolation between tenants (customers) at the application and database layers. This guarantees that one customer's data is completely segregated and inaccessible to any other customer on the platform.
          </p>

          <h2>4. Secure Payments Integration</h2>
          <p>
            We partner with industry-leading, compliant payment gateways (such as Razorpay) to handle all financial transactions. AquaSync <strong>does not process, store, or transmit full credit card numbers or sensitive financial data</strong> on our servers. All payment processing relies on tokenized exchanges directly with our secure payment providers.
          </p>

          <h2>5. Infrastructure & Monitoring</h2>
          <p>
            <strong>Cloud Infrastructure:</strong> Our platform is hosted on robust, enterprise-grade cloud infrastructure.
          </p>
          <p>
            <strong>Continuous Monitoring:</strong> We employ active monitoring to track system health, performance metrics, and potential security anomalies. Critical system events are logged to identify and respond to unusual activity promptly.
          </p>

          <h2>6. Data Backup Strategy</h2>
          <p>
            To protect against data loss from catastrophic events, we perform regular automated backups of our primary databases. These backups are encrypted and stored securely, ensuring that we can restore critical services rapidly in the event of an incident.
          </p>

          <h2>7. Incident Response</h2>
          <p>
            In the highly unlikely event of a security breach or unauthorized access, AquaSync maintains an incident response protocol designed to:
          </p>
          <ul>
            <li>Immediately contain and mitigate the threat.</li>
            <li>Investigate the scope and cause of the incident.</li>
            <li>Notify affected customers promptly and transparently, providing necessary guidance on mitigating steps.</li>
            <li>Implement necessary infrastructural changes to prevent future occurrences.</li>
          </ul>

          <h2>8. Reporting Security Vulnerabilities</h2>
          <p>
            We welcome feedback from the security community. If you believe you have discovered a security vulnerability in the AquaSync platform, we request that you act responsibly and report it to us immediately at <strong>manthanjaiswal902@gmail.com</strong> so we can investigate and remediate the issue prior to public disclosure.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
