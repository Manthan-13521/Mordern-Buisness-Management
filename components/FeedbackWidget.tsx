"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bug, Lightbulb, User } from "lucide-react";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";

export function FeedbackWidget() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<"bug" | "feedback" | "feature">("feedback");
    
    // Only show on dashboard and settings pages
    const isVisible = 
        pathname?.endsWith("/dashboard") || 
        pathname?.endsWith("/settings") || 
        pathname?.endsWith("/hostel-settings") ||
        pathname === "/superadmin"; // Include superadmin dashboard if ever added

    const [message, setMessage] = useState("");
    const [screenshot, setScreenshot] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isVisible) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message) return toast.error("Please enter a description.");

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    message,
                    screenshot,
                    page: window.location.pathname,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to submit");

            // Professional acknowledgement with type-specific messaging
            const typeLabels: Record<string, string> = {
                bug: "bug report",
                feature: "feature request",
                feedback: "feedback",
            };
            toast.success(
                `Thank you for your ${typeLabels[type] || "feedback"}. Our team has received your request and will work to resolve it within the next 12 hours.`,
                { duration: 6000, style: { maxWidth: "420px" } }
            );
            setIsOpen(false);
            setMessage("");
            setScreenshot("");
        } catch (error: any) {
            toast.error(error.message || "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <motion.div 
                className="fixed bottom-6 right-6 z-50"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 260, damping: 20 }}
            >
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all outline-none focus:ring-4 focus:ring-purple-500/30 group"
                    title="Report Issue / Feedback"
                >
                    <MessageSquare className="w-5 h-5 group-hover:block transition-all transform group-hover:-translate-y-0.5" />
                    <span className="font-semibold text-sm">Feedback</span>
                </button>
            </motion.div>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-white dark:bg-[#020617] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">Send Feedback</h2>
                                <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                                    {[
                                        { id: "feedback", icon: User, label: "Feedback" },
                                        { id: "bug", icon: Bug, label: "Bug" },
                                        { id: "feature", icon: Lightbulb, label: "Idea" },
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setType(t.id as any)}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                                                type === t.id 
                                                    ? "bg-white dark:bg-white/10 shadow-sm text-blue-600 dark:text-white" 
                                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                            }`}
                                        >
                                            <t.icon className="w-4 h-4" />
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Tell us what's happening or what's on your mind..."
                                        className="w-full bg-white dark:bg-transparent border border-gray-300 dark:border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Screenshot URL (Optional)</label>
                                    <input
                                        type="url"
                                        placeholder="https://imgur.com/your-image"
                                        className="w-full bg-white dark:bg-transparent border border-gray-300 dark:border-white/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                        value={screenshot}
                                        onChange={(e) => setScreenshot(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl py-3 font-semibold hover:contrast-125 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? "Submitting..." : (
                                        <>
                                            <Send className="w-4 h-4" /> Submit Report
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
