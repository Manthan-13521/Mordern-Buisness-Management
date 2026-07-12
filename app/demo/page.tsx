"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";


function FormLabel({
  htmlFor,
  required,
  label,
}: {
  htmlFor: string;
  required?: boolean;
  label: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
    >
      {label}
      {required ? (
        <span className="text-blue-500 ml-1">*</span>
      ) : (
        <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-1.5 uppercase tracking-wider">
          (optional)
        </span>
      )}
    </label>
  );
}

const INPUT_CLASS =
  "w-full px-4 py-3.5 rounded-xl border border-gray-300 dark:border-[#374151] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm";

function DemoPageContent() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") || "demo-page";

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
        body: JSON.stringify({ ...form, source }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit demo request.");
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-gray-50 dark:bg-[#020617] min-h-screen flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-20 relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="text-center max-w-md bg-white dark:bg-[#0b1220] p-10 sm:p-14 rounded-3xl shadow-2xl border border-gray-200 dark:border-[#1f2937] relative z-10 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-extrabold mb-4 text-gray-900 dark:text-white">
              Request Received!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Thank you for choosing AquaSync. Our team will reach out
              within <strong className="text-gray-900 dark:text-gray-200 font-semibold">12 hours</strong> during
              business hours to schedule your personalized demo.
            </p>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl py-3.5 px-8 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 active:scale-95 w-full sm:w-auto"
            >
              Return Home
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 relative z-10">
        
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-[-1]">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 dark:bg-blue-600/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 dark:bg-purple-600/20 rounded-full blur-[100px]" />
        </div>

        <div className="flex flex-col lg:flex-row bg-white dark:bg-[#0b1220] rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[#1f2937] animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Left Pane - Vibrant Visuals */}
          <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-600 to-indigo-700 p-12 text-white lg:w-5/12 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md shadow-lg border border-white/20">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl font-extrabold mb-4 leading-tight">Transform Your Operations</h2>
              <p className="text-blue-100 text-lg leading-relaxed mb-10">
                Join thousands of operators managing pools, hostels, and businesses effortlessly from a single platform.
              </p>

              <div className="space-y-5">
                {[
                  "Centralized Member Management",
                  "Automated Billing & Payments",
                  "Comprehensive Staff Tracking",
                  "Deep Analytics & Reporting"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-4 text-blue-50 font-medium">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-16 pt-8 border-t border-white/20">
              <p className="text-sm text-blue-200">
                Trusted by 500+ businesses nationwide.
              </p>
            </div>
          </div>

          {/* Right Pane - Form */}
          <div className="p-6 sm:p-10 lg:p-14 lg:w-7/12">
            <div className="mb-10 lg:hidden">
              <h1 className="text-3xl font-extrabold mb-3 text-gray-900 dark:text-white tracking-tight">
                Book Your Demo
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                See how AquaSync streamlines operations.
              </p>
            </div>
            
            <div className="hidden lg:block mb-10">
               <h1 className="text-3xl font-extrabold mb-3 text-gray-900 dark:text-white tracking-tight">
                Schedule a Walkthrough
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Fill in the details below. We'll show you exactly how AquaSync fits your business.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Row 1: Name + Phone — REQUIRED */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FormLabel htmlFor="demo-name" required label="Full Name" />
                  <input
                    id="demo-name"
                    type="text"
                    name="name"
                    autoFocus
                    autoComplete="name"
                    value={form.name}
                    onChange={handleChange}
                    className={INPUT_CLASS}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <FormLabel htmlFor="demo-phone" required label="Phone Number" />
                  <input
                    id="demo-phone"
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={handleChange}
                    className={INPUT_CLASS}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* Row 2: Email + City — OPTIONAL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FormLabel htmlFor="demo-email" label="Email Address" />
                  <input
                    id="demo-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    className={INPUT_CLASS}
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <FormLabel htmlFor="demo-city" label="City" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FormLabel htmlFor="demo-businessName" label="Business Name" />
                  <input
                    id="demo-businessName"
                    type="text"
                    name="businessName"
                    autoComplete="organization"
                    value={form.businessName}
                    onChange={handleChange}
                    className={INPUT_CLASS}
                    placeholder="AquaSync Hostel"
                  />
                </div>
                <div>
                  <FormLabel htmlFor="demo-businessType" label="Business Type" />
                  <select
                    id="demo-businessType"
                    name="businessType"
                    value={form.businessType}
                    onChange={handleChange}
                    className={`${INPUT_CLASS} appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:0.65em_auto] pr-10 cursor-pointer`}
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
                <FormLabel htmlFor="demo-notes" label="Notes / Requirements" />
                <textarea
                  id="demo-notes"
                  name="notes"
                  rows={3}
                  value={form.notes}
                  onChange={handleChange}
                  className={`${INPUT_CLASS} resize-none`}
                  placeholder="Tell us about specific features you need..."
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting || !form.name.trim() || !form.phone.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-4 px-6 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 focus:ring-4 focus:ring-blue-500/20"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Request a Free Demo
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-gray-500 dark:text-[#9ca3af] mt-4 font-medium">
                By submitting this form, you agree to our{" "}
                <a href="/privacy-policy" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function RebuiltDemoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-[#020617]" />}>
      <DemoPageContent />
    </Suspense>
  );
}
