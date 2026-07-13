"use client";

import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { CheckCircle2, Shield, Heart, Zap } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 isolate pt-32 pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              Our Mission
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
              We are on a mission to democratize enterprise-grade software for Indian small and medium businesses. We believe that local pool owners, hostel managers, and retail shops deserve the same powerful automation tools that billion-dollar corporations use.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-white/5 rounded-3xl p-8 md:p-12 border border-gray-200 dark:border-white/10 mb-20">
            <h2 className="text-3xl font-bold mb-8 text-center">Our Core Values</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <Shield className="w-8 h-8 text-blue-600 shrink-0" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Absolute Security</h3>
                  <p className="text-gray-600 dark:text-gray-400">Your data is your business. We employ bank-grade encryption, strict tenant isolation, and daily cloud backups. We never sell or share customer data.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Zap className="w-8 h-8 text-purple-600 shrink-0" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Frictionless Experience</h3>
                  <p className="text-gray-600 dark:text-gray-400">Software shouldn't require a manual. We design intuitive, lightning-fast interfaces that your staff can learn in 5 minutes.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Heart className="w-8 h-8 text-pink-600 shrink-0" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Customer Obsession</h3>
                  <p className="text-gray-600 dark:text-gray-400">We exist because of our customers. Every feature we build is a direct response to a real-world problem faced by an Indian SMB.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Transparent Pricing</h3>
                  <p className="text-gray-600 dark:text-gray-400">No hidden setup fees. No mandatory long-term lock-ins. You pay a simple, flat subscription fee for the value we deliver.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none text-center">
            <h2>The AquaSync Story</h2>
            <p>
              AquaSync started when we observed a glaring gap in the market. While massive SaaS companies were building complex, expensive tools for enterprises, local Indian businesses were still relying on paper registers and WhatsApp groups to run their operations.
            </p>
            <p>
              We saw swimming pools losing 30% of their revenue to expired memberships and unauthorized entries. We saw PG owners spending days chasing students for rent. We saw retail shops paralyzed by inventory shrinkage.
            </p>
            <p>
              So, we built AquaSync: a unified, cloud-based platform that brings QR-code access, WhatsApp automation, and real-time revenue analytics to the masses at a price point that makes sense.
            </p>
          </div>

          <div className="mt-20 text-center">
            <Link
              href="/trust"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold text-lg flex items-center justify-center gap-2"
            >
              Visit our Trust Center to learn about our security protocols &rarr;
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
