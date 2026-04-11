"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
    Store, 
    User, 
    Mail, 
    Phone, 
    Lock, 
    ArrowRight, 
    Loader2, 
    ShieldCheck,
    CheckCircle2,
    MapPin
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function BusinessRegister() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        businessName: "",
        adminName: "",
        adminEmail: "",
        adminPhone: "",
        password: "",
        address: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/business/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Registration successful! Redirecting to login...");
                setTimeout(() => router.push("/login"), 2000);
            } else {
                toast.error(data.error || "Registration failed");
                setLoading(false);
            }
        } catch (err) {
            toast.error("An error occurred. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-[#f9fafb] flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-xl animate-in fade-in duration-300">
                {/* Brand */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-[#0b1220] border border-[#1f2937] flex items-center justify-center mb-4">
                        <Store className="w-8 h-8 text-[#8b5cf6]" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#f9fafb] mb-2">Register Business</h1>
                    <p className="text-[#9ca3af] text-sm font-medium">Enterprise Suite Registration</p>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {[1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= i ? 'bg-[#8b5cf6] text-[#f9fafb]' : 'bg-[#111827] text-[#6b7280]'}`}>
                                {i}
                            </div>
                            {i === 1 && <div className={`w-12 h-0.5 rounded-full ${step > 1 ? 'bg-[#8b5cf6]' : 'bg-[#1f2937]'}`} />}
                        </div>
                    ))}
                </div>

                {/* Form Card */}
                <div className="bg-[#0b1220] border border-[#1f2937] p-8 rounded-2xl shadow-lg">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in duration-200">
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-[#f9fafb] tracking-tight border-b border-[#1f2937] pb-3">Business Identity</h3>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest block">Company Name</label>
                                        <div className="relative group">
                                            <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] group-focus-within:text-[#8b5cf6] transition-colors" />
                                            <input 
                                                required
                                                type="text"
                                                name="businessName"
                                                placeholder="e.g. Apex Manufacturing Ltd"
                                                value={formData.businessName}
                                                onChange={handleChange}
                                                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-12 pr-6 py-3.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest block">Headquarters Address</label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] group-focus-within:text-[#8b5cf6] transition-colors" />
                                            <input 
                                                required
                                                type="text"
                                                name="address"
                                                placeholder="City, State, Country"
                                                value={formData.address}
                                                onChange={handleChange}
                                                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-12 pr-6 py-3.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="w-full flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-6 py-4 rounded-xl font-bold text-sm transition-all shadow-md"
                                    >
                                        Proceed to Admin Setup
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in duration-200">
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-[#f9fafb] tracking-tight border-b border-[#1f2937] pb-3">Administrative Access</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest block">Full Name</label>
                                            <input 
                                                required
                                                type="text"
                                                name="adminName"
                                                placeholder="John Doe"
                                                value={formData.adminName}
                                                onChange={handleChange}
                                                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest block">Mobile Contact</label>
                                            <input 
                                                required
                                                type="tel"
                                                name="adminPhone"
                                                placeholder="9876543210"
                                                value={formData.adminPhone}
                                                onChange={handleChange}
                                                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest block">Enterprise Email</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] group-focus-within:text-[#8b5cf6] transition-colors" />
                                            <input 
                                                required
                                                type="email"
                                                name="adminEmail"
                                                placeholder="admin@company.com"
                                                value={formData.adminEmail}
                                                onChange={handleChange}
                                                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-12 pr-6 py-3.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest block">Secure Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] group-focus-within:text-[#8b5cf6] transition-colors" />
                                            <input 
                                                required
                                                type="password"
                                                name="password"
                                                placeholder="••••••••••••"
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-12 pr-6 py-3.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-1 px-6 py-4 bg-[#111827] hover:bg-[#1f2937] text-[#9ca3af] font-bold rounded-xl transition-all border border-[#1f2937]"
                                    >
                                        Back
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white px-6 py-4 rounded-xl font-bold text-sm transition-all shadow-md"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                        Finalize Registration
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div className="mt-8 flex items-center justify-center gap-6">
                    <p className="text-[#6b7280] text-xs text-center font-bold">
                        Already maintaining an account? <Link href="/login" className="text-[#8b5cf6] hover:text-[#7c3aed] ml-1 transition-colors">Access Portal</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
