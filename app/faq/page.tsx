"use client";

import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    category: "Data & Security",
    items: [
      {
        q: "Is my business data safe on AquaSync?",
        a: "Absolutely. All data is encrypted in transit via HTTPS/TLS, stored on secure cloud infrastructure with strict tenant isolation, and backed up regularly. Your data is logically separated from every other customer on the platform. We never share or sell your data."
      },
      {
        q: "Who owns the data I put into AquaSync?",
        a: "You do. All customer data — including member records, payment history, attendance logs, and analytics — remains the sole property of the customer. AquaSync does not claim any ownership rights over your business data."
      },
      {
        q: "Can I export my data?",
        a: "Yes. While your account is in ACTIVE or EXPIRED (Grace Period) status, you can export your data directly from the admin settings. Exports are available in Excel and JSON formats. If your account is in LOCKED status, contact our support team for export assistance."
      },
    ]
  },
  {
    category: "Subscription & Billing",
    items: [
      {
        q: "What happens when my subscription expires?",
        a: "When your subscription expires, your account enters a 3-day grace period. During this time, your dashboard becomes READ-ONLY — you can still log in and view all your data, but you cannot create, update, or delete any records. After 3 days, the account is LOCKED and you will be redirected to the renewal page."
      },
      {
        q: "Can you explain the account states?",
        a: "ACTIVE — Full access to all features. EXPIRED (3-Day Grace Period) — Read-only access. You can view data but cannot make changes. LOCKED — All access removed. Only the renewal/payment page is accessible. RENEW REQUIRED — You must complete a payment to restore full access. Upon renewal, all your data is immediately restored."
      },
      {
        q: "What plans are available?",
        a: "AquaSync offers Monthly, Quarterly, and Yearly billing cycles. All plans include the full feature set. Longer billing cycles offer better value. You can view current pricing on our pricing page."
      },
      {
        q: "Can I upgrade or downgrade my plan?",
        a: "Yes. Upgrades take effect immediately with a prorated charge. Downgrades take effect at the start of your next billing cycle — no partial refunds are issued for the remaining period of the current plan."
      },
      {
        q: "Are refunds available?",
        a: "Due to the nature of SaaS infrastructure costs, all subscription charges are final upon successful activation. Exceptions are made only for documented double-charge errors caused by the payment gateway. Please refer to our Refund Policy for full details."
      },
      {
        q: "Do you provide GST invoices?",
        a: "Payment receipts are generated through our integrated payment gateway (Razorpay). For GST-specific invoicing requirements, please contact our support team with your GSTIN and we will assist you."
      },
    ]
  },
  {
    category: "Support",
    items: [
      {
        q: "How quickly will I get a support response?",
        a: "All support requests receive a response within 12 hours during business hours (Mon–Sat, 9 AM – 9 PM IST), regardless of your subscription plan. This applies to Free/Trial, Quarterly, and Yearly plans equally."
      },
      {
        q: "How do I report a bug?",
        a: "You can report bugs via email at manthanjaiswal902@gmail.com, or use the in-app feedback widget on any dashboard page. Select 'Bug Report' and include steps to reproduce the issue along with screenshots if possible."
      },
      {
        q: "Can I request a demo before subscribing?",
        a: "Yes! Click the 'Book a Demo' button on our website or visit the demo request page. Fill in your details and our team will reach out within 12 hours to schedule a personalized walkthrough of AquaSync for your specific use case."
      },
    ]
  },
  {
    category: "Account & Access",
    items: [
      {
        q: "Can I add multiple staff members to my account?",
        a: "Yes. AquaSync supports role-based access control. As an administrator, you can add staff members who get their own login credentials with permissions scoped to their specific role — ensuring they can only access what they need."
      },
      {
        q: "Is my data accessible to other customers?",
        a: "No. AquaSync enforces strict multi-tenant isolation. Each customer's data is logically separated at the application and database layers. No other customer can view, access, or modify your information under any circumstances."
      },
      {
        q: "What happens to my data if my account is locked for a long time?",
        a: "After your account is locked, your data is retained in a dormant state for at least 90 days. After this period, we reserve the right to permanently delete the data. If you need your data before deletion, contact support to arrange an export or reactivate your subscription."
      },
    ]
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden transition-all">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <span className="font-medium text-gray-900 dark:text-white pr-4">{q}</span>
        <ChevronDown className={`w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-24 sm:py-32 w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-blue-600 dark:text-blue-500">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Find answers to common questions about AquaSync&apos;s features, billing, data handling, and support.
          </p>
        </div>

        <div className="space-y-12">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{section.category}</h2>
              <div className="space-y-3">
                {section.items.map((item, idx) => (
                  <FAQItem key={idx} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center p-8 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-2xl">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Still have questions?</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Our team responds within 12 hours during business hours.
          </p>
          <a
            href="mailto:manthanjaiswal902@gmail.com"
            className="inline-flex items-center gap-2 rounded-full py-3 px-6 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
