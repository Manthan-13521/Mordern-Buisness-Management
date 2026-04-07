import { CheckCircle } from "lucide-react";

export function HowItWorks() {
  const steps = [
    { name: "Register Your Facility", description: "Sign up and configure your pool zones or hostel blocks in minutes." },
    { name: "Onboard Members & Staff", description: "Easily import existing lists or let individuals register via our dedicated portal." },
    { name: "Automate Everything", description: "Sit back and watch automated billing, AI analytics, and duty rosters run themselves." },
  ];

  return (
    <section className="py-24 bg-gray-50 dark:bg-transparent relative isolate">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 transition-all">
            How It Works
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-400">
            A frictionless path to migrating your operational workflow.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-3xl">
          <div className="relative border-l border-gray-300 dark:border-white/10 ml-6 md:ml-0 md:border-l-0 md:flex md:justify-between md:gap-8">
             {/* Desktop line */}
             <div className="hidden md:block absolute top-[24px] left-8 right-8 h-[1px] bg-gray-300 dark:bg-white/10 z-0" />

             {steps.map((step, idx) => (
                <div key={idx} className="relative mb-12 md:mb-0 md:flex-1 md:text-center group">
                  <div className="absolute -left-[30px] md:relative md:left-auto md:mx-auto mt-1 md:mt-0 w-12 h-12 rounded-full border-4 border-gray-50 dark:border-[#020617] bg-blue-100 dark:bg-blue-900 flex items-center justify-center z-10 transition-transform group-hover:scale-110">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{idx + 1}</span>
                  </div>
                  <div className="pl-6 md:pl-0 md:pt-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{step.name}</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
                  </div>
                </div>
             ))}
          </div>
        </div>
      </div>
    </section>
  );
}
