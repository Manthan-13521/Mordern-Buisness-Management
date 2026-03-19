import Link from "next/link";
import { Check, Waves, ShieldCheck, Activity, BarChart4, Cctv } from "lucide-react";

const features = [
  {
    name: "Member Management",
    description: "Easily register and manage your members with distinct QR IDs.",
    icon: ShieldCheck,
  },
  {
    name: "AI Pool Occupancy",
    description: "Real-time AI estimations of pool crowding to ensure safety and comfort.",
    icon: Activity,
  },
  {
    name: "Analytics",
    description: "View daily, weekly, and monthly trends on registrations, check-ins, and renewals.",
    icon: BarChart4,
  },
];

const tiers = [
  {
    name: "Starter Plan",
    id: "tier-starter",
    href: "/subscribe?plan=starter",
    priceMonthly: "₹2,500",
    description: "Perfect for single location pools just getting started with digitalization.",
    features: ["Up to 500 Active Members", "Basic QR Entry Logging", "Manual Water Quality Logs", "WhatsApp Support"],
    featured: false,
  },
  {
    name: "Pro Plan",
    id: "tier-pro",
    href: "/subscribe?plan=pro",
    priceMonthly: "₹5,000",
    description: "Ideal for busy facilities requiring AI insights and automated crowd control.",
    features: [
      "Unlimited Members",
      "AI Crowd Control System",
      "Automated Entry/Exit with Face Scan",
      "Race Event Management Module",
      "Priority 24/7 Support",
    ],
    featured: true,
  },
  {
    name: "Enterprise Plan",
    id: "tier-enterprise",
    href: "/subscribe?plan=enterprise",
    priceMonthly: "Custom",
    description: "For chains and franchises with advanced integrations and central reporting.",
    features: [
      "Multiple Pool Locations",
      "Custom Branding & Domain",
      "Dedicated Account Manager",
    ],
    featured: false,
  },
];

function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function SaaSMarketingLanding() {
  return (
    <div className="bg-white dark:bg-gray-950">
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
              <span className="sr-only">AquaSync</span>
              <Waves className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xl font-bold dark:text-white">AquaSync SaaS</span>
            </Link>
          </div>
          <div className="flex flex-1 justify-end items-center gap-4">
            <Link href="/login" className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-full px-4 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Pool Admin Login
            </Link>
            <Link href="/superadmin/login" className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
              Platform Admin
            </Link>
          </div>
        </nav>
      </header>

      <main className="isolate bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 pb-16 pt-24 sm:pb-24 sm:pt-32 lg:pb-32 lg:pt-40">
        <div className="px-6 mx-auto max-w-7xl lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white">
              The Operating System for Modern Swimming Pools
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Manage memberships, automate entry with QR & Face tracking, predict crowding, and manage your staff—all from a single dynamic dashboard. 
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <a
                href="#pricing"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Start Your Pool Software
              </a>
              <a href="#features" className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                Explore Features <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Feature section */}
      <div id="features" className="mx-auto mt-32 max-w-7xl px-6 sm:mt-40 lg:px-8 pb-32">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600 dark:text-indigo-400">Everything you need</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            No more paper logs or spreadsheets
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Pricing section */}
      <div id="pricing" className="bg-gray-50 dark:bg-gray-900/50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-base font-semibold leading-7 text-indigo-600 dark:text-indigo-400">Pricing</h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
              Pricing plans for pools of all sizes
            </p>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600 dark:text-gray-400">
            Choose the tier that covers your volume and operational requirements. Upgrade any time.
          </p>
          <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {tiers.map((tier, tierIdx) => (
              <div
                key={tier.id}
                className={classNames(
                  tier.featured ? 'lg:z-10 lg:rounded-b-none' : 'lg:mt-8',
                  tierIdx === 0 ? 'lg:rounded-r-none' : '',
                  tierIdx === tiers.length - 1 ? 'lg:rounded-l-none' : '',
                  'flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10 dark:bg-gray-950 dark:ring-gray-800 shadow-xl'
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-x-4">
                    <h3
                      id={tier.id}
                      className={classNames(
                        tier.featured ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white',
                        'text-lg font-semibold leading-8'
                      )}
                    >
                      {tier.name}
                    </h3>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-400">{tier.description}</p>
                  <div className="mt-6 flex items-baseline gap-x-1">
                    <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{tier.priceMonthly}</span>
                    {tier.priceMonthly !== 'Custom' && <span className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-400">/month</span>}
                  </div>
                  <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex gap-x-3">
                        <Check className="h-6 w-5 flex-none text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <a
                  href={tier.href}
                  aria-describedby={tier.id}
                  className={classNames(
                    tier.featured
                      ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500'
                      : 'text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300 dark:text-indigo-400 dark:ring-indigo-800 dark:hover:ring-indigo-700',
                    'mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all'
                  )}
                >
                  Get started today
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
