"use client";

import Link from "next/link";
import { 
  QrCode, 
  WalletCards, 
  Users, 
  CheckCircle2, 
  XOctagon,
  MessageCircle,
  BellRing,
  Cloud,
  LayoutGrid,
  CalendarClock,
  Store,
  LineChart,
  HardHat,
  Boxes
} from "lucide-react";
import { motion } from "framer-motion";

const poolFeatures = [
  { name: "Instant QR Entry Access", description: "Members scan & enter — no manual tracking needed", icon: QrCode },
  { name: "Track Pending Payments Easily", description: "Never lose money — see who hasn't paid instantly", icon: WalletCards },
  { name: "Auto WhatsApp Alerts", description: "Send payment reminders & entry logs automatically (others DON'T have this)", icon: MessageCircle },
  { name: "Smart Member Expiry Alerts", description: "Know who's expiring in next 3 days — boost renewals", icon: BellRing },
  { name: "Secure Cloud Backup", description: "Your data is always safe (unlike local software)", icon: Cloud },
  { name: "Real-Time Pool Occupancy", description: "Maintain safety limits automatically", icon: Users },
];

const hostelFeatures = [
  { name: "Visual Room & Bed Management", description: "See occupancy like a map — no confusion", icon: LayoutGrid },
  { name: "Automated Rent Tracking", description: "System auto-calculates dues & flags defaulters", icon: WalletCards },
  { name: "Advance + Monthly Payment Logic", description: "Handles real hostel payment flow correctly", icon: CalendarClock },
  { name: "WhatsApp Rent Reminders", description: "No need to manually call tenants", icon: MessageCircle },
  { name: "Secure Data + Backup", description: "Never lose records again", icon: Cloud },
  { name: "Staff & Attendance Tracking", description: "Monitor staff with ease", icon: Users },
];

const businessFeatures = [
  { name: "Inventory & Stock Tracking", description: "Real-time material management with low-stock alerts", icon: Boxes },
  { name: "Digital Customer Ledger", description: "Track every sale, payment, and outstanding balance", icon: LineChart },
  { name: "Staff & Labour Attendance", description: "Log daily presence and optimize payroll", icon: HardHat },
  { name: "Professional Invoicing", description: "Generate digital bills instantly for clients", icon: WalletCards },
  { name: "Revenue Analytics", description: "Visualize profit margins and growth trends", icon: LineChart },
  { name: "Multi-Admin Access", description: "Secure role-based access for your team", icon: Users },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-white dark:bg-[#020617] relative">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10 flex flex-col gap-32">
        
        {/* Pool Section */}
        <div className="flex flex-col gap-12">
          {/* Header */}
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-blue-400 sm:text-4xl mb-4">
              Smart Pool Management That Runs Itself
            </h2>
            <p className="text-lg leading-8 text-gray-600 dark:text-gray-300">
              Automate entries, payments, and alerts — all in one powerful system.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Side: Features & Comparison */}
            <div className="lg:col-span-7 flex flex-col gap-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {poolFeatures.map((feat: any) => (
                  <div key={feat.name} className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <feat.icon className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">{feat.name}</h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{feat.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison Strip */}
              <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-6 ring-1 ring-gray-200 dark:ring-white/10">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Why not traditional software?</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <XOctagon className="h-5 w-5 text-red-500" /> <span className="text-sm">No WhatsApp automation</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <XOctagon className="h-5 w-5 text-red-500" /> <span className="text-sm">No QR entry system</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <XOctagon className="h-5 w-5 text-red-500" /> <span className="text-sm">No cloud backup</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <XOctagon className="h-5 w-5 text-red-500" /> <span className="text-sm">Manual tracking only</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                      <span className="text-sm italic">💸 Costs ₹15,000/year</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-gray-200 font-medium pb-1 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">AquaSync:</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="text-sm">Fully automated</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="text-sm">Secure cloud system</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="text-sm">Smart alerts</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                      <CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="text-sm">Lower price</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Pricing Card */}
            <div className="lg:col-span-5 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-[2.5rem] blur-xl opacity-20"></div>
              <motion.div 
                className="relative flex flex-col bg-white dark:bg-[#0a0f25] rounded-[2rem] p-8 sm:p-10 ring-1 ring-gray-200 dark:ring-blue-500/30 shadow-2xl overflow-hidden"
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">Choose Your Plan</h3>
                
                <div className="space-y-6 flex-1">
                  {/* Plan 1 */}
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-blue-500/50 transition-colors relative">
                    <span className="absolute -top-3 left-4 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      🔥 One Time Offer
                    </span>
                    <div className="flex justify-between items-center mt-2">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Quarterly Plan</h4>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-sm text-gray-400 line-through">₹3500</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">₹3000</span>
                      </div>
                    </div>
                  </div>

                  {/* Plan 2 */}
                  <div className="rounded-2xl border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 p-5 relative transform scale-105 shadow-xl">
                    <span className="absolute -top-3 left-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      🔥 Best Value
                    </span>
                    <div className="flex justify-between items-center mt-2">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-blue-400">Yearly Plan</h4>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-sm text-blue-400/70 line-through">₹12000</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">₹7999</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10">
                  <Link 
                    href="/subscribe" 
                    className="block w-full text-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-4 text-sm font-bold text-white shadow-lg hover:from-blue-500 hover:to-cyan-500 transition-all font-sans relative overflow-hidden group"
                  >
                    <span className="relative z-10">Get Started</span>
                    <div className="absolute inset-0 h-full w-full bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -translate-x-full skew-x-12"></div>
                  </Link>
                  <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4 font-medium uppercase tracking-wider">
                    Limited-time pricing
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Hostel Section */}
        <div className="flex flex-col gap-12 pt-16 border-t border-gray-200 dark:border-white/10">
          {/* Header */}
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-purple-400 sm:text-4xl mb-4">
              Complete Hostel Control — From Beds to Payments
            </h2>
            <p className="text-lg leading-8 text-gray-600 dark:text-gray-300">
              Manage rooms, rent, and residents without spreadsheets.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Side: Features & Comparison */}
            <div className="lg:col-span-7 flex flex-col gap-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {hostelFeatures.map((feat: any) => (
                  <div key={feat.name} className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <feat.icon className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">{feat.name}</h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{feat.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison Strip */}
              <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-6 ring-1 ring-gray-200 dark:ring-white/10">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Why not traditional software?</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <XOctagon className="h-5 w-5 text-red-500" /> <span className="text-sm">No automation</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <XOctagon className="h-5 w-5 text-red-500" /> <span className="text-sm">No structured room system</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <XOctagon className="h-5 w-5 text-red-500" /> <span className="text-sm">No reminders</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <XOctagon className="h-5 w-5 text-red-500" /> <span className="text-sm">Risk of data loss</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                      <span className="text-sm italic">💸 Costs ₹15,000/year per block</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-gray-200 font-medium pb-1 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">AquaSync:</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="text-sm">Fully automated hostel system</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="text-sm">Smart rent engine</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="text-sm">Secure cloud storage</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                      <CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="text-sm">Affordable pricing</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Pricing Card */}
            <div className="lg:col-span-5 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-[2.5rem] blur-xl opacity-20"></div>
              <motion.div 
                className="relative flex flex-col bg-white dark:bg-[#120a20] rounded-[2rem] p-8 sm:p-10 ring-1 ring-gray-200 dark:ring-purple-500/30 shadow-2xl overflow-hidden"
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
                
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">Flexible Pricing by Size</h3>
                
                <div className="space-y-4 flex-1">
                  {/* Plan 1 */}
                  <div className="rounded-2xl border-2 border-purple-500 bg-purple-50/50 dark:bg-purple-500/10 p-5 relative transform scale-[1.02] shadow-lg">
                    <span className="absolute -top-3 left-4 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      🔥 Offer
                    </span>
                    <div className="flex justify-between items-center mt-2">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 dark:text-purple-400">1 Block</h4>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-xs text-purple-400/70 line-through">₹8000</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">₹5999<span className="text-sm font-normal text-purple-400/70">/year</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Plan 2 */}
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 hover:border-purple-500/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white">2 Blocks</h4>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-xs text-gray-400 line-through">₹12000</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">₹9999<span className="text-sm font-normal text-gray-500">/year</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Plan 3 */}
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 hover:border-purple-500/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white">3 Blocks</h4>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-xs text-gray-400 line-through">₹18000</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">₹14999<span className="text-sm font-normal text-gray-500">/year</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Plan 4 */}
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 hover:border-purple-500/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white">4 Blocks</h4>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-xs text-gray-400 line-through">₹24000</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">₹17999<span className="text-sm font-normal text-gray-500">/year</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <Link 
                    href="/hostel/register" 
                    className="block w-full text-center rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-4 text-sm font-bold text-white shadow-lg hover:from-purple-500 hover:to-pink-500 transition-all font-sans relative overflow-hidden group"
                  >
                    <span className="relative z-10">Start Managing Hostel</span>
                    <div className="absolute inset-0 h-full w-full bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -translate-x-full skew-x-12"></div>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Business Section */}
        <div className="flex flex-col gap-12 pt-16 border-t border-gray-200 dark:border-white/10">
          {/* Header */}
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-emerald-400 sm:text-4xl mb-4">
              Enterprise Business Suite — Beyond Just Pools
            </h2>
            <p className="text-lg leading-8 text-gray-600 dark:text-gray-300">
              Control your trading business, manufacturing unit, or service center with precision.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Side: Features */}
            <div className="lg:col-span-7 flex flex-col gap-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {businessFeatures.map((feat: any) => (
                  <div key={feat.name} className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <feat.icon className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">{feat.name}</h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{feat.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* USP Strip */}
              <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl p-6 ring-1 ring-emerald-200 dark:ring-emerald-500/20">
                <div className="flex items-start gap-4">
                  <Store className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mt-1" />
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Scale your business professionally</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">AquaSync BIZ is designed for small to medium enterprises that need strict data isolation, ledger management, and workforce tracking without the complexity of traditional ERPs.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: CTA Card */}
            <div className="lg:col-span-5 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2.5rem] blur-xl opacity-20"></div>
              <motion.div 
                className="relative flex flex-col bg-white dark:bg-[#051510] rounded-[2rem] p-8 sm:p-10 ring-1 ring-gray-200 dark:ring-emerald-500/30 shadow-2xl overflow-hidden"
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
                
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">Business Launch Offer</h3>
                
                <div className="space-y-6 flex-1">
                  {/* Quarterly Plan */}
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-emerald-500/50 transition-colors relative">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Quarterly Plan</h4>
                        <p className="text-xs text-gray-500 mt-1">3 Months Business Access</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">₹1999</span>
                      </div>
                    </div>
                  </div>

                  {/* Yearly Plan - Best Value */}
                  <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 p-5 relative transform scale-105 shadow-xl">
                    <span className="absolute -top-3 left-4 bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg tracking-widest">
                      🔥 Best Value
                    </span>
                    <div className="flex justify-between items-center mt-2">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-emerald-400 uppercase tracking-tight">Yearly Plan</h4>
                        <p className="text-xs text-emerald-600 dark:text-emerald-500/70 font-medium">Full Access — 12 Months</p>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">₹4999</span>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {["Unlimited Sales Logs", "Labour Management", "Stock Inventory", "24/7 Priority Support"].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-10">
                  <Link 
                    href="/business/register" 
                    className="block w-full text-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 text-sm font-bold text-white shadow-lg hover:from-emerald-500 hover:to-teal-500 transition-all font-sans relative overflow-hidden group"
                  >
                    <span className="relative z-10">Register My Business</span>
                    <div className="absolute inset-0 h-full w-full bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -translate-x-full skew-x-12"></div>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
