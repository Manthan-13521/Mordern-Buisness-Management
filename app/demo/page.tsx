"use client";

import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Send, ChevronDown, ChevronUp, Zap } from "lucide-react";

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm";
const LABEL_CLASS = "block text-xs font-semibold mb-1.5 text-gray-500 dark:text-gray-400 uppercase tracking-wide";

function DemoForm() {
  const searchParams = useSearchParams();
  const sourceParam = searchParams.get("source") || "demo-page";

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    businessName: "",
    businessType: "pool",
    city: "",
    notes: "",
  });
  const [showOptional, setShowOptional] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Please enter your name and phone number.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: sourceParam }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      setSubmitted(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("demoSubmitted", "true");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6 py-24">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-3 text-gray-900 dark:text-white">
              You&apos;re all set! 🎉
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              We&apos;ve received your request. Our team will call you within{" "}
              <strong className="text-gray-700 dark:text-gray-200">12 hours</strong> to schedule
              your personalized demo.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-full py-3 px-7 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Back to Home
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">

          {/* Hero Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-full px-4 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-5">
              <Zap className="w-3.5 h-3.5" />
              Free Demo — No Credit Card Required
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
              Book a Free Demo
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Just your name and number — we&apos;ll take care of the rest.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-slate-900/50 border border-gray-100 dark:border-white/8 rounded-2xl shadow-sm p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Required fields */}
              <div>
                <label htmlFor="demo-name" className={LABEL_CLASS}>
                  Full Name <span className="text-blue-500">*</span>
                </label>
                <input
                  id="demo-name"
                  type="text"
                  name="name"
                  required
                  autoFocus
                  value={form.name}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label htmlFor="demo-phone" className={LABEL_CLASS}>
                  Phone Number <span className="text-blue-500">*</span>
                </label>
                <input
                  id="demo-phone"
                  type="tel"
                  name="phone"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>

              {/* Optional fields toggle */}
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors pt-1"
              >
                {showOptional ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showOptional ? "Hide optional details" : "Add optional details"}
              </button>

              {/* Collapsible optional fields */}
              {showOptional && (
                <div className="space-y-4 pt-1 border-t border-gray-100 dark:border-white/8">
                  <div>
                    <label htmlFor="demo-email" className={LABEL_CLASS}>
                      Email Address
                    </label>
                    <input
                      id="demo-email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className={INPUT_CLASS}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="demo-businessName" className={LABEL_CLASS}>
                        Business Name
                      </label>
                      <input
                        id="demo-businessName"
                        type="text"
                        name="businessName"
                        value={form.businessName}
                        onChange={handleChange}
                        className={INPUT_CLASS}
                        placeholder="Business name"
                      />
                    </div>
                    <div>
                      <label htmlFor="demo-city" className={LABEL_CLASS}>
                        City
                      </label>
                      <input
                        id="demo-city"
                        type="text"
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                        className={INPUT_CLASS}
                        placeholder="Your city"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="demo-businessType" className={LABEL_CLASS}>
                      Business Type
                    </label>
                    <select
                      id="demo-businessType"
                      name="businessType"
                      value={form.businessType}
                      onChange={handleChange}
                      className={INPUT_CLASS}
                    >
                      <option value="pool">Swimming Pool</option>
                      <option value="hostel">Hostel</option>
                      <option value="business">Business</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="demo-notes" className={LABEL_CLASS}>
                      Notes / Requirements
                    </label>
                    <textarea
                      id="demo-notes"
                      name="notes"
                      rows={3}
                      value={form.notes}
                      onChange={handleChange}
                      className={`${INPUT_CLASS} resize-none`}
                      placeholder="Any specific features or questions…"
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !form.name.trim() || !form.phone.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-6 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-2"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Sending…
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Request a Demo
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                We&apos;ll respond within 12 hours.{" "}
                <a href="/privacy-policy" className="text-blue-500 hover:underline">
                  Privacy Policy
                </a>
              </p>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function DemoRequestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
      <DemoForm />
    </Suspense>
  );
}
