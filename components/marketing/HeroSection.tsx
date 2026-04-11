"use client";

import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-16 lg:pt-40 lg:pb-32">
      {/* Background gradients */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] opacity-20 dark:opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)', background: 'linear-gradient(135deg, var(--color-primary), var(--color-purple))' }} />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              The Enterprise Engine for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">Modern Businesses</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              High-performance management software for Swimming Pools, Hostels, and Trading Businesses. Automate your workforce, inventory, and revenue with one unified dashboard.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link 
                href="#features"
                className="relative group overflow-hidden rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-purple))' }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="absolute -inset-1 blur-md bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-40 transition-opacity z-[-1]"></div>
                Get Started
              </Link>
              <Link href="#demo" className="flex items-center gap-2 text-sm font-semibold leading-6 text-gray-900 dark:text-white transition hover:opacity-80">
                <PlayCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                Watch Demo
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Dashboard Preview Mockup */}
        <motion.div 
          className="mt-16 sm:mt-24"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="rounded-xl lg:rounded-3xl p-2 sm:p-4 bg-black/5 dark:bg-white/5 ring-1 ring-inset ring-gray-900/10 dark:ring-white/10 backdrop-blur-md">
            <div className="rounded-md lg:rounded-2xl overflow-hidden shadow-2xl relative bg-white dark:bg-[#020617] border border-gray-200 dark:border-white/10 flex items-center justify-center p-8 lg:p-12 min-h-[400px]">
              {/* Mock content for the dashboard picture */}
              <div className="w-full flex flex-col gap-6 w-full">
                <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-4">
                  <div className="h-6 w-32 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                  <div className="h-8 w-24 bg-blue-500/20 rounded-full animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-white/5 dark:border dark:border-white/10 animate-pulse flex p-4 flex-col justify-end">
                       <div className="h-4 w-1/2 bg-gray-200 dark:bg-white/10 rounded mb-2" />
                       <div className="h-6 w-1/3 bg-gray-300 dark:bg-white/20 rounded" />
                    </div>
                  ))}
                </div>
                <div className="h-64 mt-4 w-full rounded-xl bg-gray-100 dark:bg-white/5 dark:border dark:border-white/10 animate-pulse relative overflow-hidden">
                   <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-blue-500/20 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
