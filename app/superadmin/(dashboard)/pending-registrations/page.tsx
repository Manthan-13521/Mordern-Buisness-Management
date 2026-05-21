import { dbConnect } from "@/lib/mongodb";
import { PendingBusinessRegistration } from "@/models/PendingBusinessRegistration";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PendingRegistrationsPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "superadmin") {
        redirect("/superadmin/login");
    }

    await dbConnect();

    // Fetch all pending registrations, sorted by newest first
    const pendingList = await PendingBusinessRegistration.find({}).sort({ createdAt: -1 }).lean();

    return (
        <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Pending Registrations</h1>
                    <p className="text-[#9ca3af] mt-1">
                        Track and manage abandoned onboarding flows and pending payments.
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-[#1f2937] bg-[#0b1220] overflow-hidden">
                <div className="p-6 border-b border-[#1f2937]">
                    <h3 className="text-lg font-medium text-white">Onboarding Leads</h3>
                    <p className="text-sm text-[#9ca3af]">Businesses that started registration but may not have paid yet.</p>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-[#020617] text-[#9ca3af] border-b border-[#1f2937]">
                            <tr>
                                <th className="px-6 py-4 font-medium">Business & Owner</th>
                                <th className="px-6 py-4 font-medium">Contact Info</th>
                                <th className="px-6 py-4 font-medium">Plan Details</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2937]">
                            {pendingList.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[#9ca3af]">
                                        No pending registrations found.
                                    </td>
                                </tr>
                            ) : (
                                pendingList.map((registration: any) => {
                                    const createdTime = new Date(registration.createdAt).getTime();
                                    const oneHourAgo = Date.now() - 60 * 60 * 1000;
                                    const isAbandoned = registration.status === "pending" && createdTime < oneHourAgo;

                                    return (
                                        <tr key={registration._id.toString()} className="hover:bg-[#1f2937]/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white">{registration.businessName}</div>
                                                <div className="text-xs text-[#9ca3af] mt-1">{registration.adminName}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-white">{registration.adminEmail}</div>
                                                {registration.adminPhone && (
                                                    <div className="text-xs text-[#9ca3af] mt-1">{registration.adminPhone}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1f2937] text-white capitalize">
                                                    {registration.planType}
                                                </span>
                                                {registration.referralCode && (
                                                    <div className="text-xs text-[#8b5cf6] mt-2 font-medium bg-[#8b5cf6]/10 px-2 py-0.5 rounded-full w-fit">
                                                        Ref: {registration.referralCode}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {registration.status === "completed" ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Completed
                                                    </span>
                                                ) : registration.status === "expired" ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-400">
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        Expired
                                                    </span>
                                                ) : isAbandoned ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        Abandoned
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        In Progress
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-[#9ca3af]">
                                                {new Date(registration.createdAt).toLocaleString("en-IN", {
                                                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                                })}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
