"use client";

import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { TrustSection } from "@/components/marketing/TrustSection";
import Link from "next/link";
import { CheckCircle2, ChevronDown, QrCode, MessageSquare, LineChart, Users } from "lucide-react";
import { useState } from "react";
import { ClientOnlyComponents } from "@/components/marketing/ClientOnlyComponents";

export default function PoolManagementSoftware() {
  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-900 dark:selection:text-blue-200">
      <Navbar />

      <main className="flex-1 isolate">
        {/* ── Hero Section ── */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1)_0%,transparent_70%)] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium text-sm mb-6 border border-blue-200 dark:border-blue-800">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                #1 Pool Management Software in India
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-8">
                Automate Your Swimming Pool Operations with{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">
                  AquaSync
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
                Stop losing money to expired memberships and unauthorized entries. Our cloud-based SaaS platform provides QR-code access control, automated WhatsApp payment reminders, and real-time revenue analytics designed specifically for Indian swimming pool businesses.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/select-plan"
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
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
              <p className="mt-6 text-sm text-gray-500">No credit card required. Setup takes less than 5 minutes.</p>
            </div>
          </div>
        </section>

        <TrustSection />

        {/* ── Feature Breakdown ── */}
        <section className="py-24 bg-gray-50 dark:bg-white/[0.02] border-y border-gray-200 dark:border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Built Specifically for Pool Owners</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Managing a commercial swimming pool comes with unique challenges. From tracking daily walk-ins to managing monthly subscriptions, AquaSync provides the exact tools you need.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard 
                icon={<QrCode className="w-6 h-6 text-blue-600" />}
                title="QR Access Control"
                description="Issue digital ID cards. Members scan their QR code at reception to verify their active subscription instantly."
              />
              <FeatureCard 
                icon={<MessageSquare className="w-6 h-6 text-green-600" />}
                title="WhatsApp Automation"
                description="Send automated payment reminders 3 days before expiry, and instant digital receipts upon payment collection."
              />
              <FeatureCard 
                icon={<Users className="w-6 h-6 text-purple-600" />}
                title="Membership Tracking"
                description="Track monthly, quarterly, and yearly members alongside daily walk-in guests with separate revenue streams."
              />
              <FeatureCard 
                icon={<LineChart className="w-6 h-6 text-orange-600" />}
                title="Revenue Analytics"
                description="Stop manual calculations. View daily collections, pending dues, and monthly growth trends on a visual dashboard."
              />
            </div>
          </div>
        </section>

        {/* ── Detailed Benefits ── */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h3 className="text-3xl font-bold mb-6">Eliminate Revenue Leakage</h3>
                <div className="space-y-6">
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    The biggest hidden cost in running a swimming pool is unauthorized access. When staff fail to check expiry dates during rush hours, members swim for free.
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    AquaSync's QR code system forces accountability. The system flashes a bright red warning and emits an alert sound if an expired member attempts to enter. Your staff cannot bypass the system, ensuring every entry is accounted for and paid.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Zero unauthorized entries",
                      "Staff accountability mode",
                      "Instant digital verification",
                      "Block defaulters automatically"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 blur-3xl -z-10 rounded-full" />
                <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-2xl aspect-square flex items-center justify-center relative overflow-hidden">
                   {/* Abstract representation of the dashboard */}
                   <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px]" />
                   <div className="relative z-10 w-full max-w-sm space-y-4">
                     <div className="h-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm w-3/4 animate-pulse" />
                     <div className="h-32 bg-white dark:bg-gray-800 rounded-lg shadow-sm w-full animate-pulse" />
                     <div className="flex gap-4">
                       <div className="h-24 bg-white dark:bg-gray-800 rounded-lg shadow-sm w-1/2 animate-pulse" />
                       <div className="h-24 bg-white dark:bg-gray-800 rounded-lg shadow-sm w-1/2 animate-pulse" />
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing CTA ── */}
        <section className="py-20 bg-blue-600 text-white text-center px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Modernize Your Pool?</h2>
            <p className="text-xl text-blue-100 mb-10">
              Join hundreds of pool owners across India using AquaSync to maximize revenue and eliminate manual paperwork. Plans start at just ₹3,000/quarter.
            </p>
            <Link
              href="/select-plan"
              className="inline-flex px-8 py-4 bg-white text-blue-600 hover:bg-gray-50 font-bold rounded-xl transition-all shadow-lg"
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
              q="How does the QR code entry system work for swimming pools?" 
              a="AquaSync generates a unique digital QR ID card for every active member. When members scan their QR code at your pool's reception, the system instantly verifies their membership status. If their subscription is expired, the system alerts your staff and denies entry, completely eliminating revenue leakage from unauthorized access."
            />
            <FAQItem 
              q="Can I send automated payment reminders to members?" 
              a="Yes. Our software integrates directly with WhatsApp to automatically send payment reminders to members before their subscription expires. It also sends instant confirmation receipts when a payment is recorded, ensuring professional communication with zero manual effort."
            />
            <FAQItem 
              q="Does it track daily occupancy and attendance?" 
              a="Absolutely. The dashboard provides real-time occupancy tracking. You can see exactly how many members checked in today, peak hours of operation, and historical attendance trends to better manage staff shifts and pool maintenance schedules."
            />
            <FAQItem 
              q="Do I need special hardware?" 
              a="No special hardware is required. You can run AquaSync on any standard desktop, laptop, or tablet. For QR scanning, any standard USB barcode/QR scanner ($15-$30 on Amazon) works perfectly via plug-and-play."
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
    <div className="bg-white dark:bg-[#0a0f1c] p-6 rounded-2xl border border-gray-200 dark:border-white/10 hover:border-blue-500/50 transition-colors shadow-sm">
      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-6">
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
