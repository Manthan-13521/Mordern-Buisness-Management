import Link from "next/link";
import { ArrowRight, UserPlus, ShieldCheck, Clock } from "lucide-react";

export default async function PoolLanding({ params }: { params: Promise<{ poolSlug: string }> }) {
  const pSlug = await params;
  const poolSlug = pSlug.poolSlug;
  return (
    <div className="bg-background">

      <div className="relative isolate px-6 pt-14 lg:px-8 overflow-hidden">
        {/* Decorative Grid BG */}
        <div className="absolute inset-0 -z-10 bg-[url('https://tailwindcss.com/_next/static/media/docs-dark@tinypng.1bbe175e.png')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

        <div className="mx-auto max-w-2xl py-24 sm:py-32 lg:py-40">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white">
              {poolSlug ? `${poolSlug.replace('-', ' ').toUpperCase()} Registration` : 'Swimming Pool Management'}
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Register online instantly, secure your membership, and get your digital QR ID card generated electronically within seconds.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href={`/pool/${poolSlug}/register`}
                className="rounded-md bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-50 dark:hover:bg-blue-500/100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 flex items-center gap-2"
              >
                Register Now <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href={`/pool/${poolSlug}/admin/login`} className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
                Admin Area <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="py-24 sm:py-32 bg-background/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600 dark:text-blue-400 dark:text-indigo-400">Streamlined Process</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">Everything required to hit the water</p>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
              Our newly upgraded portal ensures your access passes are ready before you even step through the doors.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0">
                    <UserPlus className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Online Registration
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">Skip the queue. Select a membership plan, capture your photo, and proceed to interactive checkout.</dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0">
                    <Clock className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Instant QR ID
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">Immediately upon verification, your unique CR80 formatted ID card with a high-fidelity QR core will be rendered.</dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0">
                    <ShieldCheck className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Secure Entry
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">Flash your digital or printed card at the scanner desk and the physical logs will autonomously verify your membership parameters.</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
