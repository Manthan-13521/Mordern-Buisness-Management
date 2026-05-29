import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Metadata } from "next";
import { Shield, Lock, Server, CheckCircle2, CreditCard, Activity, Database, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Trust Center | AquaSync SaaS",
  description: "AquaSync Trust Center detailing our commitment to security, privacy, and system reliability.",
  alternates: {
    canonical: "https://aquasync.com/trust",
  },
  openGraph: {
    title: "Trust Center | AquaSync SaaS",
    description: "AquaSync Trust Center detailing our commitment to security, privacy, and system reliability.",
  }
};

export default function TrustCenter() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const securityFeatures = [
    { name: "HTTPS Encrypted", description: "All data in transit is encrypted using modern TLS protocols.", icon: Lock },
    { name: "Role-Based Access Control", description: "Strict permission models ensure users only access what they need.", icon: Users },
    { name: "Tenant Isolation", description: "Logical separation of data guarantees cross-tenant privacy.", icon: Server },
    { name: "Secure Payment Processing", description: "Payments handled by compliant, industry-leading gateways.", icon: CreditCard },
    { name: "Monitoring & Alerting", description: "Active system health checks and anomaly detection.", icon: Activity },
    { name: "Automated Backups", description: "Encrypted backups to ensure data recovery capabilities.", icon: Database },
  ];

  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-6 py-24 sm:py-32 w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-blue-600 dark:text-blue-500">
            AquaSync Trust Center
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            We believe that trust is the foundation of any successful partnership. Discover how we protect your data, ensure privacy, and maintain high system reliability.
          </p>
          <p className="text-sm text-gray-500 mt-4">Last updated: {lastUpdated}</p>
        </div>

        {/* Compliance & Security Grid */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-8 flex items-center justify-center gap-2">
            <Shield className="w-6 h-6 text-green-500" />
            Compliance & Security
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityFeatures.map((feature, idx) => (
              <div key={idx} className="p-6 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-slate-900/50 hover:border-blue-500 transition-colors">
                <feature.icon className="w-8 h-8 text-blue-500 mb-4" />
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  {feature.name}
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Commitments */}
        <div className="grid md:grid-cols-2 gap-12">
          
          <section className="prose prose-blue dark:prose-invert">
            <h3>Data Protection & Ownership</h3>
            <p>
              Your business data belongs exclusively to you. AquaSync acts as a secure custodian of your information. We enforce stringent tenant isolation to ensure your data is never accessible to unauthorized users. Refer to our <a href="/data-retention-policy">Data Retention Policy</a> for full details.
            </p>
          </section>

          <section className="prose prose-blue dark:prose-invert">
            <h3>Privacy Commitment</h3>
            <p>
              We are committed to transparency in how we handle your information. We collect only what is necessary to deliver the AquaSync service and <strong>we do not sell your personal data</strong>. Learn more in our <a href="/privacy-policy">Privacy Policy</a>.
            </p>
          </section>

          <section className="prose prose-blue dark:prose-invert">
            <h3>System Availability</h3>
            <p>
              We design our infrastructure for high availability and resilience. By utilizing enterprise-grade cloud hosting and implementing continuous monitoring, we strive to provide uninterrupted access to your vital management tools.
            </p>
          </section>

          <section className="prose prose-blue dark:prose-invert">
            <h3>Support & Incident Response</h3>
            <p>
              In the event of an operational issue or security concern, our team is equipped to respond swiftly. We prioritize transparent communication to keep you informed of any service impacts and resolution timelines.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
