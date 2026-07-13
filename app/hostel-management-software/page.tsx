"use client";

import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { TrustSection } from "@/components/marketing/TrustSection";
import Link from "next/link";
import { CheckCircle2, ChevronDown, BedDouble, MessageSquare, Wallet, Users, Home } from "lucide-react";
import { useState } from "react";
import { ClientOnlyComponents } from "@/components/marketing/ClientOnlyComponents";

export default function HostelManagementSoftware() {
  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-900 dark:selection:text-blue-200">
      <Navbar />

      <main className="flex-1 isolate">
        {/* ── Hero Section ── */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.1)_0%,transparent_70%)] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium text-sm mb-6 border border-purple-200 dark:border-purple-800">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                The Smartest PG & Hostel ERP
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-8">
                Run Your Hostel on Autopilot with{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
                  AquaSync
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
                Managing a hostel shouldn't mean endless spreadsheets and chasing students for rent. AquaSync automates room allocation, sends WhatsApp rent reminders, tracks student ledgers, and gives you a bird's-eye view of your entire business.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/select-plan"
                  className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2"
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
              <p className="mt-6 text-sm text-gray-500">Setup takes minutes. Cloud-based and accessible anywhere.</p>
            </div>
          </div>
        </section>

        <TrustSection />

        {/* ── Feature Breakdown ── */}
        <section className="py-24 bg-gray-50 dark:bg-white/[0.02] border-y border-gray-200 dark:border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything a Hostel Owner Needs</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                AquaSync replaces your scattered ledgers and WhatsApp groups with a single, powerful command center designed explicitly for Indian PGs and hostels.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard 
                icon={<BedDouble className="w-6 h-6 text-purple-600" />}
                title="Room & Bed Allocation"
                description="Visual floor plans. See instantly which rooms are full, which beds are empty, and maximize your occupancy rates."
              />
              <FeatureCard 
                icon={<MessageSquare className="w-6 h-6 text-green-600" />}
                title="WhatsApp Rent Reminders"
                description="Stop making awkward phone calls. The system automatically messages students when rent is due and sends payment receipts."
              />
              <FeatureCard 
                icon={<Wallet className="w-6 h-6 text-blue-600" />}
                title="Digital Student Ledger"
                description="Track security deposits, partial payments, and pending dues with pinpoint accuracy for every single resident."
              />
              <FeatureCard 
                icon={<Users className="w-6 h-6 text-orange-600" />}
                title="Staff Management"
                description="Manage your wardens, cooks, and cleaning staff. Track daily attendance, salary advances, and monthly payouts."
              />
            </div>
          </div>
        </section>

        {/* ── Detailed Benefits ── */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1 relative">
                <div className="absolute inset-0 bg-gradient-to-bl from-purple-600/20 to-pink-600/20 blur-3xl -z-10 rounded-full" />
                <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-2xl aspect-square flex flex-col justify-center relative overflow-hidden">
                   {/* Abstract representation of the room allocation UI */}
                   <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:20px_20px]" />
                   <div className="relative z-10 w-full grid grid-cols-2 gap-4">
                     {[1,2,3,4].map((i) => (
                       <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                          <div className="flex justify-between items-center mb-3">
                             <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
                             <Home className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="flex gap-2">
                            <div className="h-2 flex-1 bg-green-400 rounded-full" />
                            <div className="h-2 flex-1 bg-green-400 rounded-full" />
                            <div className="h-2 flex-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
                          </div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <h3 className="text-3xl font-bold mb-6">Eliminate Vacancy Blind Spots</h3>
                <div className="space-y-6">
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    Empty beds are lost revenue. But tracking which student is moving out when, and which bed is available across multiple floors is chaotic on paper.
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    With AquaSync's visual allocation system, you have real-time visibility into your entire property. You know exactly how many beds are vacant today, and how many will become vacant next week based on check-out notices.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Real-time visual bed availability",
                      "Prevent double-booking errors",
                      "Track upcoming check-outs",
                      "Analyze historical occupancy rates"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing CTA ── */}
        <section className="py-20 bg-purple-600 text-white text-center px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Scale Your Hostel Business</h2>
            <p className="text-xl text-purple-100 mb-10">
              Stop fighting with ledgers and start growing your business. AquaSync provides enterprise-grade tools at a price designed for Indian PG owners. Plans start at just ₹5,999/year.
            </p>
            <Link
              href="/select-plan"
              className="inline-flex px-8 py-4 bg-white text-purple-600 hover:bg-gray-50 font-bold rounded-xl transition-all shadow-lg"
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
              q="How does the room and bed allocation work in AquaSync?" 
              a="AquaSync provides a visual representation of your hostel blocks, floors, and rooms. You can define the exact capacity of each room. When admitting a student, you simply select an available bed. The system automatically updates the occupancy status, ensuring you never double-book a bed and always have a real-time view of vacancies."
            />
            <FAQItem 
              q="Can I automatically send monthly rent reminders to students?" 
              a="Yes, this is one of our most powerful features. The system automatically calculates the monthly rent due dates for each student and sends personalized WhatsApp messages reminding them to pay. It completely eliminates the awkwardness and manual effort of chasing students for rent."
            />
            <FAQItem 
              q="Does it track partial payments and pending dues?" 
              a="Absolutely. Each student has a digital ledger. If a student pays only a portion of their rent, the system logs the exact amount paid and automatically carries over the pending balance to the next cycle. You can view a consolidated report of all pending dues across the entire hostel with one click."
            />
            <FAQItem 
              q="Can I manage multiple hostel buildings?" 
              a="Yes, AquaSync is built to scale. You can create multiple 'Blocks' or buildings within a single hostel dashboard. The analytics engine will show you consolidated revenue and occupancy across all your properties, or let you drill down into individual buildings."
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
    <div className="bg-white dark:bg-[#0a0f1c] p-6 rounded-2xl border border-gray-200 dark:border-white/10 hover:border-purple-500/50 transition-colors shadow-sm">
      <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mb-6">
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
