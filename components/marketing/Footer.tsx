import Link from "next/link";
import { Waves } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-[#020617] border-t border-gray-200 dark:border-white/10 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="sr-only">AquaSync</span>
              <Waves className="h-8 w-8 text-blue-500" />
              <span className="text-xl font-bold dark:text-white">AquaSync SaaS</span>
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The premier unified platform for managing swimming pools and hostel accommodations.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white mb-4">Product</h3>
            <ul className="space-y-3">
              <li><Link href="#features" className="text-sm leading-6 text-gray-600 dark:text-gray-400 hover:text-blue-500">Features</Link></li>
              <li><Link href="#pricing" className="text-sm leading-6 text-gray-600 dark:text-gray-400 hover:text-blue-500">Pricing</Link></li>
              <li><Link href="/login" className="text-sm leading-6 text-gray-600 dark:text-gray-400 hover:text-blue-500">Admin Portal</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link href="/privacy-policy" className="text-sm leading-6 text-gray-600 dark:text-gray-400 hover:text-blue-500">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm leading-6 text-gray-600 dark:text-gray-400 hover:text-blue-500">Terms & Conditions</Link></li>
              <li><Link href="/refund-policy" className="text-sm leading-6 text-gray-600 dark:text-gray-400 hover:text-blue-500">Refund Policy</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="text-sm leading-6 text-gray-600 dark:text-gray-400">manthanjaiswal902@gmail.com</li>
              <li className="text-sm leading-6 text-gray-600 dark:text-gray-400">+91 8125629601</li>
              <li className="text-sm leading-6 text-gray-600 dark:text-gray-400">India</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-gray-200 dark:border-white/10 pt-8 sm:mt-20 md:flex md:items-center md:justify-between lg:mt-24">
          <p className="mt-8 text-xs leading-5 text-gray-500 md:order-1 md:mt-0">
            &copy; {new Date().getFullYear()} AquaSync SaaS. All rights reserved. Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
          </p>
        </div>
      </div>
    </footer>
  );
}
