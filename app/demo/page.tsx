"use client";

import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";

function DemoForm() {
  const searchParams = useSearchParams();
  const sourceParam = searchParams.get("source") || "demo-page";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    businessType: "pool",
    city: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Demo Request Received!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Thank you for your interest in AquaSync. Our team will reach out to you within <strong>12 hours</strong> during business hours to schedule your personalized demo.
            </p>
            <a href="/" className="inline-flex items-center gap-2 rounded-full py-3 px-6 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
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
      <main className="flex-1 max-w-2xl mx-auto px-6 py-24 sm:py-32 w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-blue-600 dark:text-blue-500">
            Book a Demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            See how AquaSync can streamline your pool, hostel, or business operations. Fill in the form below and our team will schedule a personalized walkthrough.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="demo-name" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Full Name *</label>
              <input
                id="demo-name"
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="demo-email" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email Address</label>
              <input
                id="demo-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="demo-phone" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Phone Number *</label>
              <input
                id="demo-phone"
                type="tel"
                name="phone"
                required
                value={form.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="+91 XXXXXXXXXX"
              />
            </div>
            <div>
              <label htmlFor="demo-city" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">City</label>
              <input
                id="demo-city"
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Hyderabad"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="demo-businessName" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Business Name *</label>
              <input
                id="demo-businessName"
                type="text"
                name="businessName"
                required
                value={form.businessName}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Your business name"
              />
            </div>
            <div>
              <label htmlFor="demo-businessType" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Business Type *</label>
              <select
                id="demo-businessType"
                name="businessType"
                required
                value={form.businessType}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="pool">Swimming Pool</option>
                <option value="hostel">Hostel</option>
                <option value="business">Business</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="demo-notes" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Notes / Requirements</label>
            <textarea
              id="demo-notes"
              name="notes"
              rows={4}
              value={form.notes}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="Tell us about your requirements or any specific features you're interested in..."
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-6 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              "Submitting..."
            ) : (
              <>
                <Send className="w-4 h-4" />
                Request a Demo
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-500 dark:text-gray-500">
            By submitting this form, you agree to our{" "}
            <a href="/privacy-policy" className="text-blue-500 hover:underline">Privacy Policy</a>.
            We&apos;ll respond within 12 hours during business hours.
          </p>
        </form>
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
