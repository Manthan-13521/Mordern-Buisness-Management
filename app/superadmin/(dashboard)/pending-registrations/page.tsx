import { dbConnect } from "@/lib/mongodb";
import { PendingBusinessRegistration } from "@/models/PendingBusinessRegistration";
import { Clock, CheckCircle2, XCircle, FileClock } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import { SAPageHeader } from "@/components/superadmin/ui/SAPageHeader";
import { SATable, SATableContainer, SATHead, SATH, SATBody, SATR, SATD } from "@/components/superadmin/ui/SATable";
import { SABadge } from "@/components/superadmin/ui/SABadge";
import { SAEmptyState } from "@/components/superadmin/ui/SAEmptyState";

export const dynamic = "force-dynamic";

export default async function PendingRegistrationsPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "superadmin") {
        redirect("/superadmin/login");
    }

    await dbConnect();

    // Fetch all pending registrations (excluding completed ones), sorted by newest first
    const pendingList = await PendingBusinessRegistration.find({ status: { $ne: "completed" } }).sort({ createdAt: -1 }).lean();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <SAPageHeader 
                title="Pending Registrations"
                description="Track and manage abandoned onboarding flows and pending payments."
                icon={<FileClock className="w-6 h-6 text-[var(--sa-accent)]" />}
            />

            <SATableContainer>
                <div className="p-6 border-b border-[var(--sa-border)]">
                    <h3 className="text-lg font-bold text-[var(--sa-text-primary)]">Onboarding Leads</h3>
                    <p className="text-sm text-[var(--sa-text-muted)]">Businesses that started registration but may not have paid yet.</p>
                </div>
                
                <SATable>
                    <SATHead>
                        <SATR>
                            <SATH>Business & Owner</SATH>
                            <SATH>Contact Info</SATH>
                            <SATH>Plan Details</SATH>
                            <SATH>Status</SATH>
                            <SATH>Created</SATH>
                        </SATR>
                    </SATHead>
                    <SATBody>
                        {pendingList.length === 0 ? (
                            <SATR>
                                <SATD colSpan={5}>
                                    <SAEmptyState 
                                        title="No pending registrations"
                                        description="All onboarding flows have been completed."
                                        icon={<CheckCircle2 className="w-6 h-6" />}
                                    />
                                </SATD>
                            </SATR>
                        ) : (
                            pendingList.map((registration: any) => {
                                const createdTime = new Date(registration.createdAt).getTime();
                                const oneHourAgo = Date.now() - 60 * 60 * 1000;
                                const isAbandoned = registration.status === "pending" && createdTime < oneHourAgo;

                                return (
                                    <SATR key={registration._id.toString()}>
                                        <SATD>
                                            <div className="font-bold text-[var(--sa-text-primary)]">{registration.businessName}</div>
                                            <div className="text-xs text-[var(--sa-text-muted)] mt-1">{registration.adminName}</div>
                                        </SATD>
                                        <SATD>
                                            <div className="text-[var(--sa-text-primary)] font-medium">{registration.adminEmail}</div>
                                            {registration.adminPhone && (
                                                <div className="text-xs text-[var(--sa-text-muted)] mt-1">{registration.adminPhone}</div>
                                            )}
                                        </SATD>
                                        <SATD>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--sa-bg-elevated)] text-[var(--sa-text-primary)] border border-[var(--sa-border)] capitalize">
                                                {registration.planType}
                                            </span>
                                            {registration.referralCode && (
                                                <div className="text-xs text-[var(--sa-accent)] mt-2 font-bold bg-[var(--sa-accent)]/10 px-2 py-0.5 rounded-md w-fit border border-[var(--sa-accent)]/20">
                                                    Ref: {registration.referralCode}
                                                </div>
                                            )}
                                        </SATD>
                                        <SATD>
                                            {registration.status === "completed" ? (
                                                <SABadge variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                                                    Completed
                                                </SABadge>
                                            ) : registration.status === "expired" ? (
                                                <SABadge variant="danger" icon={<XCircle className="w-3.5 h-3.5" />}>
                                                    Expired
                                                </SABadge>
                                            ) : isAbandoned ? (
                                                <SABadge variant="warning" icon={<Clock className="w-3.5 h-3.5" />}>
                                                    Abandoned
                                                </SABadge>
                                            ) : (
                                                <SABadge variant="info" icon={<Clock className="w-3.5 h-3.5" />}>
                                                    In Progress
                                                </SABadge>
                                            )}
                                        </SATD>
                                        <SATD className="text-xs text-[var(--sa-text-secondary)] font-medium">
                                            {new Date(registration.createdAt).toLocaleString("en-IN", {
                                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                            })}
                                        </SATD>
                                    </SATR>
                                );
                            })
                        )}
                    </SATBody>
                </SATable>
            </SATableContainer>
        </div>
    );
}
