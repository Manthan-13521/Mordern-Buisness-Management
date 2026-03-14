import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import { Pool } from "@/models/Pool";

export default function PlatformBillingDashboard() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Platform Billing</h1>
            <p className="text-gray-400">View and manage SaaS subscription payments from your managed pools.</p>
            
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center text-gray-500">
                <p>Billing module is currently in development.</p>
                <p className="text-sm mt-2">Check back soon for Stripe/Razorpay automated subscription handling.</p>
            </div>
        </div>
    );
}
