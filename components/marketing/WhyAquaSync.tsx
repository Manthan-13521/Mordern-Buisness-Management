"use client";

import { CheckCircle2, TrendingUp, Clock } from "lucide-react";
import { motion } from "framer-motion";

export function WhyAquaSync() {
  const benefits = [
    {
      title: "Saves 10+ hours/week",
      description: "Automate repetitive administrative tasks, billing reminders, and member onboarding.",
      icon: Clock,
      color: "text-blue-500"
    },
    {
      title: "Reduces Payment Leakage",
      description: "Strict enforcement of renewals, pending dues alerts, and transparent tracking.",
      icon: CheckCircle2,
      color: "text-purple-500"
    },
    {
      title: "Real-time Occupancy Insights",
      description: "Instantly see how many beds or pool slots are occupied. Never overbook again.",
      icon: TrendingUp,
      color: "text-blue-400"
    }
  ];

  return (
    <section id="why-aquasync" className="py-24 sm:py-32 bg-gray-50 dark:bg-transparent">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-blue-600 dark:text-blue-500">Why AquaSync?</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Everything you need to scale, without the chaos.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <motion.div 
                key={benefit.title} 
                className="flex flex-col dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 bg-white shadow-lg ring-1 ring-gray-200 rounded-2xl p-8"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7 text-gray-900 dark:text-white">
                  <benefit.icon className={`h-8 w-8 flex-none ${benefit.color}`} aria-hidden="true" />
                  {benefit.title}
                </dt>
                <dd className="mt-4 flex flex-col flex-auto text-base leading-7 text-gray-600 dark:text-gray-400">
                  <p className="flex-auto">{benefit.description}</p>
                </dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
