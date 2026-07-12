"use client";

import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm";

function Label({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300"
    >
      {children}
      {required ? (
        <span className="text-blue-500 ml-0.5">*</span>
      ) : (
        <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-1">
          (optional)
        </span>
      )}
    </label>
  );
}

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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => setForm({ ...form, [e.target.name]: e.target.value });

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
      if (typeof window !== "undefined")
        localStorage.setItem("demoSubmitted", "true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white dark:bg-[#020617] min-h-screen flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6 py-24">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              Demo Request Received!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Thank you for your interest in AquaSync. Our team will reach out
              within <strong className="text-gray-800 dark:text-gray-200">12 hours</strong> during
              business hours to schedule your personalized demo.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-full py-3 px-6 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
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
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-blue-600 dark:text-blue-500">
            Book a Demo
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
            See how AquaSync can streamline your pool, hostel, or business
            operations. Fill in the form and our team will schedule a
            personalized walkthrough.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Row 1: Name + Phone — REQUIRED */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label htmlFor="demo-name" required>Full Name</Label>
              <input
                id="demo-name"
                type="text"
                name="name"
                autoFocus
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                className={INPUT_CLASS}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="demo-phone" required>Phone Number</Label>
              <input
                id="demo-phone"
                type="tel"
                name="phone"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
                className={INPUT_CLASS}
                placeholder="+91 XXXXXXXXXX"
              />
            </div>
          </div>

          {/* Row 2: Email + City — OPTIONAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label htmlFor="demo-email">Email Address</Label>
              <input
                id="demo-email"
                type="email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                className={INPUT_CLASS}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="demo-city">City</Label>
              <input
                id="demo-city"
                type="text"
                name="city"
                autoComplete="address-level2"
                value={form.city}
                onChange={handleChange}
                className={INPUT_CLASS}
                placeholder="e.g. Hyderabad"
              />
            </div>
          </div>

          {/* Row 3: Business Name + Type — OPTIONAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label htmlFor="demo-businessName">Business Name</Label>
              <input
                id="demo-businessName"
                type="text"
                name="businessName"
                autoComplete="organization"
                value={form.businessName}
                onChange={handleChange}
                className={INPUT_CLASS}
                placeholder="Your business name"
              />
            </div>
            <div>
              <Label htmlFor="demo-businessType">Business Type</Label>
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
          </div>

          {/* Row 4: Notes — OPTIONAL */}
          <div>
            <Label htmlFor="demo-notes">Notes / Requirements</Label>
            <textarea
              id="demo-notes"
              name="notes"
              rows={4}
              value={form.notes}
              onChange={handleChange}
              className={`${INPUT_CLASS} resize-none`}
              placeholder="Tell us about your requirements or any specific features you're interested in..."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !form.name.trim() || !form.phone.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-6 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Submitting…
              </span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Request a Demo
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-500 dark:text-gray-500 pb-4">
            By submitting this form, you agree to our{" "}
            <a href="/privacy-policy" className="text-blue-500 hover:underline">
              Privacy Policy
            </a>
            . We&apos;ll respond within 12 hours during business hours.
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
