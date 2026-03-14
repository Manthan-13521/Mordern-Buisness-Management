"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, Mail, MapPin, Loader2, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

function SubscribeFormContent() {
    const searchParams = useSearchParams();
    const plan = searchParams.get("plan") || "starter";

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [poolData, setPoolData] = useState<any>(null);

    const [form, setForm] = useState({
        poolName: "",
        city: "",
        adminEmail: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/pool/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, plan })
            });

            const data = await res.json();
            
            if (res.ok) {
                setPoolData(data);
                setSuccess(true);
            } else {
                alert(data.error || "Something went wrong.");
            }
        } catch (error) {
            console.error(error);
            alert("Error connecting to server.");
        } finally {
            setLoading(false);
        }
    };

    if (success && poolData) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 dark:bg-gray-950">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="flex justify-center text-green-500">
                        <CheckCircle2 className="w-16 h-16" />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        Pool Registered Successfully!
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        Your pool system is ready to use. Save these credentials securely.
                    </p>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 dark:bg-gray-900">
                        <dl className="space-y-4">
                            <div>
                                <dt className="text-sm border-b border-gray-200 dark:border-gray-800 pb-1 font-medium text-gray-500 dark:text-gray-400">Pool Name</dt>
                                <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{poolData.pool.poolName}</dd>
                            </div>
                            <div>
                                <dt className="text-sm border-b border-gray-200 dark:border-gray-800 pb-1 font-medium text-gray-500 dark:text-gray-400">Admin Email</dt>
                                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{poolData.admin.email}</dd>
                            </div>
                            <div>
                                <dt className="text-sm border-b border-gray-200 dark:border-gray-800 pb-1 font-medium text-gray-500 dark:text-gray-400">Admin Password</dt>
                                <dd className="mt-1 text-mono text-lg font-bold text-indigo-600 dark:text-indigo-400">{poolData.rawPassword}</dd>
                                <p className="text-xs text-red-500 mt-1">Make sure you copy this password, it won't be shown again.</p>
                            </div>
                        </dl>

                        <div className="mt-8 space-y-4">
                            <a 
                                href={`/${poolData.pool.slug}/admin/login`}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition"
                            >
                                Login to Admin Portal
                            </a>
                            <a 
                                href={`/${poolData.pool.slug}`}
                                className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition"
                            >
                                View Public Registration Page
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 dark:bg-gray-950">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                    Setup your Pool
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    Signing up for the <span className="font-semibold text-indigo-600 dark:text-indigo-400">{plan.toUpperCase()}</span> plan.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="poolName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Pool Name
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Building2 className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="poolName"
                                    required
                                    value={form.poolName}
                                    onChange={(e) => setForm({ ...form, poolName: e.target.value })}
                                    className="pl-10 block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white py-2"
                                    placeholder="Blue Waves Aquatic Center"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                City / Location
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPin className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="city"
                                    required
                                    value={form.city}
                                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                                    className="pl-10 block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white py-2"
                                    placeholder="Hyderabad"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Primary Admin Email
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    id="adminEmail"
                                    required
                                    value={form.adminEmail}
                                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                                    className="pl-10 block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white py-2"
                                    placeholder="admin@bluewaves.com"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Subscription & Generate System"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function SubscribePageWrapper() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center dark:bg-gray-950"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>}>
            <SubscribeFormContent />
        </Suspense>
    );
}
