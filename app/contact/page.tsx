"use client";

import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 isolate pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              Get in Touch
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Whether you have a question about our pricing, need a custom feature, or want technical support, our team is ready to answer all your questions.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Information */}
            <div className="space-y-8">
              <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-8 border border-gray-200 dark:border-white/10">
                <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
                <div className="space-y-6 text-gray-600 dark:text-gray-400">
                  <div className="flex gap-4">
                    <Phone className="w-6 h-6 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Phone Support / Sales</p>
                      <p>+91 8125629601</p>
                      <p className="text-sm mt-1">Available Mon-Sat, 9am - 7pm IST</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Mail className="w-6 h-6 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Email Address</p>
                      <p><a href="mailto:manthanjaiswal902@gmail.com" className="hover:text-blue-600">manthanjaiswal902@gmail.com</a></p>
                      <p className="text-sm mt-1">We aim to respond within 24 hours.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <MapPin className="w-6 h-6 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Headquarters</p>
                      <p>Hyderabad, Telangana, India</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Clock className="w-6 h-6 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Technical Support Hours</p>
                      <p>24/7 for Enterprise Clients</p>
                      <p>Priority support for standard tier.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form Placeholder - In a real app this would connect to an API route */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                    <input type="text" id="name" className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="John Doe" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                    <input type="email" id="email" className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="john@company.com" />
                  </div>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                  <select id="subject" className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all">
                    <option>Sales Inquiry</option>
                    <option>Technical Support</option>
                    <option>Billing Question</option>
                    <option>Partnership</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</label>
                  <textarea id="message" rows={5} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="How can we help you?"></textarea>
                </div>
                <button type="button" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                  Send Message
                </button>
                <p className="text-xs text-gray-500 text-center">By submitting this form, you agree to our Privacy Policy.</p>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
