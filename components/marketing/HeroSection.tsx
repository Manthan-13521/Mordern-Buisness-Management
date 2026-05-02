"use client";

import Link from "next/link";
import Image from "next/image";
import { PlayCircle } from "lucide-react";
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

        {/* Dashboard Preview — Real Product Image */}
        <motion.div
          className="mt-16 sm:mt-24 relative"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Radial gradient glow behind image */}
          <div
            className="absolute inset-0 -z-10 pointer-events-none"
            aria-hidden="true"
            style={{
              background: 'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.08) 40%, transparent 70%)',
            }}
          />

          <div className="mx-auto max-w-[1100px] px-2 sm:px-4">
            <div
              className="hero-dashboard-wrapper relative rounded-[16px] sm:rounded-[20px] overflow-hidden"
              style={{
                boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(59,130,246,0.25)',
                transform: 'perspective(1200px) rotateX(6deg) rotateY(-4deg)',
                transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Light Mode Image */}
              <Image
                src="/dashboard-light.png"
                alt="AquaSync SaaS Revenue Analytics Dashboard — Light Mode"
                width={1100}
                height={700}
                priority
                quality={90}
                className="w-full h-auto block dark:hidden"
                sizes="(max-width: 768px) 95vw, (max-width: 1200px) 85vw, 1100px"
              />
              {/* Dark Mode Image */}
              <Image
                src="/dashboard-dark.png"
                alt="AquaSync SaaS Revenue Analytics Dashboard — Dark Mode"
                width={1100}
                height={700}
                priority
                quality={90}
                className="w-full h-auto hidden dark:block"
                sizes="(max-width: 768px) 95vw, (max-width: 1200px) 85vw, 1100px"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
