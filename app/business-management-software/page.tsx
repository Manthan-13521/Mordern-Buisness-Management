"use client";

import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { TrustSection } from "@/components/marketing/TrustSection";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Package, FileText, Briefcase, Users, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { ClientOnlyComponents } from "@/components/marketing/ClientOnlyComponents";

export default function BusinessManagementSoftware() {
  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-900 dark:selection:text-blue-200">
      <Navbar />

      <main className="flex-1 isolate">
        {/* ── Hero Section ── */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1)_0%,transparent_70%)] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium text-sm mb-6 border border-emerald-200 dark:border-emerald-800">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                The Complete Suite for Indian SMBs
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-8">
                Master Your Inventory and Billing with{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
                  AquaSync
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
                Take complete control of your retail or wholesale business. From tracking stock levels and generating GST-ready invoices, to managing customer credit ledgers and daily labour attendance—all from one lightning-fast cloud dashboard.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/select-plan"
                  className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2"
                >
                  Start Your Free Trial
                </Link>
                <Link
                  href="/demo"
                  className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  Book a Live Demo
                </Link>
              </div>
              <p className="mt-6 text-sm text-gray-500">Accessible on mobile, tablet, and desktop.</p>
            </div>
          </div>
        </section>

        <TrustSection />

        {/* ── Feature Breakdown ── */}
        <section className="py-24 bg-gray-50 dark:bg-white/[0.02] border-y border-gray-200 dark:border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Core Modules for Growing Businesses</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Stop jumping between five different apps to run your shop. AquaSync combines inventory, sales, customer management, and HR into one cohesive system.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard 
                icon={<Package className="w-6 h-6 text-emerald-600" />}
                title="Live Inventory Tracking"
                description="Monitor stock levels in real-time. The system automatically deducts stock upon sales and alerts you when items run low."
              />
              <FeatureCard 
                icon={<FileText className="w-6 h-6 text-blue-600" />}
                title="Invoicing & Sales"
                description="Generate professional invoices in seconds. Record cash, UPI, card, or credit sales and print them directly."
              />
              <FeatureCard 
                icon={<Briefcase className="w-6 h-6 text-orange-600" />}
                title="Customer Ledgers"
                description="Manage 'Udhaar' (credit) professionally. Track outstanding balances for every customer and log partial payments."
              />
              <FeatureCard 
                icon={<Users className="w-6 h-6 text-purple-600" />}
                title="Labour & HR"
                description="Mark daily attendance, track salary advances, and auto-calculate monthly payouts for all your staff members."
              />
            </div>
          </div>
        </section>

        {/* ── Detailed Benefits ── */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h3 className="text-3xl font-bold mb-6">Stop Inventory Shrinkage</h3>
                <div className="space-y-6">
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    When you rely on paper notebooks to track your stock, items quietly go missing and you lose money without ever realizing it.
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    AquaSync enforces strict digital accountability. Every item added to your inventory must be accounted for via a recorded sale or an authorized manual adjustment. You get complete visibility into the lifecycle of every product in your warehouse or store.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Automated stock deduction on invoice generation",
                      "Low stock threshold alerts",
                      "Categorize items by type and unit",
                      "Export stock reports for auditing"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600/20 to-teal-600/20 blur-3xl -z-10 rounded-full" />
                <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-2xl aspect-square flex items-center justify-center relative overflow-hidden">
                   {/* Abstract representation of the business dashboard */}
                   <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]" />
                   <div className="relative z-10 w-full max-w-sm space-y-4">
                     <div className="flex gap-4 mb-6">
                       <div className="h-16 flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm animate-pulse border border-emerald-500/20" />
                       <div className="h-16 flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm animate-pulse border border-blue-500/20" />
                       <div className="h-16 flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm animate-pulse border border-orange-500/20" />
                     </div>
                     <div className="h-40 bg-white dark:bg-gray-800 rounded-lg shadow-sm w-full animate-pulse flex flex-col justify-end p-4 gap-2">
                        <div className="flex items-end gap-2 h-full pt-4">
                           <div className="w-1/6 bg-emerald-200 dark:bg-emerald-900/50 rounded-t h-[40%]" />
                           <div className="w-1/6 bg-emerald-300 dark:bg-emerald-800/50 rounded-t h-[70%]" />
                           <div className="w-1/6 bg-emerald-400 dark:bg-emerald-700/50 rounded-t h-[50%]" />
                           <div className="w-1/6 bg-emerald-500 dark:bg-emerald-600/50 rounded-t h-[90%]" />
                           <div className="w-1/6 bg-emerald-600 dark:bg-emerald-500/50 rounded-t h-[100%]" />
                        </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing CTA ── */}
        <section className="py-20 bg-emerald-600 text-white text-center px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Take Control of Your Business Today</h2>
            <p className="text-xl text-emerald-100 mb-10">
              Join thousands of Indian business owners who have modernized their operations with AquaSync. Comprehensive business management starting at just ₹1,999/quarter.
            </p>
            <Link
              href="/select-plan"
              className="inline-flex px-8 py-4 bg-white text-emerald-600 hover:bg-gray-50 font-bold rounded-xl transition-all shadow-lg"
            >
              View Pricing & Select Plan
            </Link>
          </div>
        </section>

        {/* ── FAQs ── */}
        <section className="py-24 max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <FAQItem 
              q="How does the inventory management module track stock?" 
              a="AquaSync maintains a real-time digital ledger of all your stock items. When you record a sale, the corresponding items are automatically deducted from your inventory. When you record a purchase, stock is added. You can view current stock levels, low-stock alerts, and historical movement across all your items instantly."
            />
            <FAQItem 
              q="Can I manage credit customers and pending payments?" 
              a="Yes, our customer ledger is built exactly for this. When generating a sales invoice, you can record it as a 'Credit Sale'. The system logs the outstanding amount against that specific customer. You can view individual customer statements, total outstanding balances across the business, and record partial payments easily."
            />
            <FAQItem 
              q="Does the software track daily labour attendance?" 
              a="Absolutely. The labour module allows you to mark daily attendance (Present, Half-Day, Absent) for all your staff. It automatically calculates monthly payouts based on their attendance and deducts any salary advances you have given them, generating a clean final settlement report."
            />
            <FAQItem 
              q="Is my financial data secure?" 
              a="Yes. We use industry-standard HTTPS/TLS encryption. Your business data is stored on highly secure, compliant AWS servers with strict tenant isolation. No one else has access to your business data, and we perform automated daily backups."
            />
          </div>
        </section>
      </main>

      <Footer />
      <ClientOnlyComponents />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white dark:bg-[#0a0f1c] p-6 rounded-2xl border border-gray-200 dark:border-white/10 hover:border-emerald-500/50 transition-colors shadow-sm">
      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
        {description}
      </p>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden transition-all bg-white dark:bg-[#0a0f1c]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <span className="font-medium text-gray-900 dark:text-white pr-4">{q}</span>
        <ChevronDown className={`w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className={`px-5 overflow-hidden transition-all duration-200 ease-in-out ${
          open ? "pb-5 max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pt-2 text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-sm leading-relaxed">
          {a}
        </div>
      </div>
    </div>
  );
}
