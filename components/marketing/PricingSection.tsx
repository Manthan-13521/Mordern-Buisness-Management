import { Check } from "lucide-react";

export function PricingSection() {
  const plans = [
    {
      name: "Basic",
      id: "tier-basic",
      href: "#features",
      price: "$29",
      description: "Everything you need to manage a single small property.",
      features: ["Up to 50 Members / 20 Beds", "Manual Billing Tracking", "Basic Analytics Dashboard", "Email Support"],
      mostPopular: false,
    },
    {
      name: "Pro",
      id: "tier-pro",
      href: "#features",
      price: "$79",
      description: "Advanced automation for scaling operations.",
      features: [
        "Unlimited Members & Staff",
        "Automated Payment Alerts",
        "AI Occupancy & Real-time Density",
        "Multi-tenant Access",
        "Priority 24/7 Support",
      ],
      mostPopular: true,
    },
  ];

  return (
    <section id="pricing" className="bg-white dark:bg-[#020617] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600 dark:text-blue-500">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Pricing plans for teams of all sizes
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600 dark:text-gray-400">
          Choose an affordable plan that's packed with the best features for managing your property, and scale effortlessly.
        </p>
        
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:gap-x-8 xl:gap-x-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl p-8 xl:p-10 transition-all ${
                plan.mostPopular
                  ? "ring-2 ring-blue-500 shadow-2xl relative bg-white dark:bg-white/10 dark:backdrop-blur-xl dark:border dark:border-white/20"
                  : "ring-1 ring-gray-200 dark:ring-white/10 bg-gray-50/50 dark:bg-white/5 dark:backdrop-blur-md"
              }`}
            >
              {plan.mostPopular && (
                <div className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-1 text-sm font-semibold text-white shadow-md">
                  Most Popular
                </div>
              )}
              <div className="flex items-center justify-between gap-x-4">
                <h3 className={`text-lg font-semibold leading-8 ${plan.mostPopular ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-gray-200'}`}>
                  {plan.name}
                </h3>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-400">{plan.description}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{plan.price}</span>
                <span className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-400">/month</span>
              </p>
              <a
                href={plan.href}
                className={`mt-6 block rounded-xl px-3 py-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                  plan.mostPopular
                    ? "bg-blue-600 text-white shadow-sm hover:bg-blue-500 focus-visible:outline-blue-600"
                    : "text-blue-600 dark:text-blue-400 ring-1 ring-inset ring-blue-200 dark:ring-blue-900 hover:ring-blue-300 dark:hover:bg-blue-900/30"
                }`}
              >
                Get started
              </a>
              <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <Check className={`h-6 w-5 flex-none ${plan.mostPopular ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
