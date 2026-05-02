"use client";

import { motion } from "framer-motion";
import CountUp from "react-countup";

const trustStats = [
  { prefix: "", number: 5000, suffix: "+", label: "Active Members" },
  { prefix: "", number: 5, suffix: "+", label: "Admins" },
  { prefix: "", number: 1000, suffix: "+", label: "Transactions" },
  { prefix: "₹", number: 20, suffix: "+ Lakhs", label: "Revenue Managed" },
  { prefix: "", number: 99.9, suffix: "%", label: "Uptime", decimals: 1 },
];

export function TrustSection() {
  return (
    <section className="relative py-16 bg-white dark:bg-[#020617] overflow-hidden">
      {/* Top Gradient Divider */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-gray-300 dark:via-blue-500/20 to-transparent" />
      
      {/* Bottom Gradient Divider */}
      <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-gray-300 dark:via-blue-500/20 to-transparent" />

      {/* Subtle Radial Glow Background */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex justify-center items-center">
        <div className="w-[600px] h-[300px] bg-blue-500/5 dark:bg-blue-600/5 blur-[100px] rounded-full" />
      </div>

      <motion.div 
        className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-center text-sm uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400">
          Trusted by the world&apos;s most innovative teams
        </h2>

        {/* Trust Stats */}
        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-12 items-center justify-center">
          {trustStats.map((stat, i) => (
            <div
              key={stat.label}
              className="group flex flex-col items-center text-center cursor-default transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white transition-opacity duration-300 opacity-90 group-hover:opacity-100" style={{ textShadow: "0 4px 20px rgba(59, 130, 246, 0.15)" }}>
                <span className="transition-all duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" style={{ textShadow: "0 0 20px rgba(59,130,246,0.3)" }}>
                  {stat.prefix}
                  <CountUp
                    end={stat.number}
                    decimals={stat.decimals || 0}
                    duration={2.5}
                    separator=","
                    enableScrollSpy
                    scrollSpyOnce
                    scrollSpyDelay={100}
                  />
                  {stat.suffix}
                </span>
              </div>
              <span className="mt-2 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400/60 transition-colors duration-300 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <motion.div 
          className="mt-16 sm:mt-24 flex flex-wrap justify-center gap-8 text-sm font-medium text-gray-500 dark:text-gray-400"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
            </div>
            Secure Payments
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
              <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
            </div>
            Real-time Analytics
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
            </div>
            Multi-tenant System
          </div>
        </motion.div>

      </motion.div>
    </section>
  );
}
