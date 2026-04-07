export const dynamic = "force-dynamic";

import { HostelSidebar } from "@/components/hostel/HostelSidebar";
import { HostelTopbar } from "@/components/hostel/HostelTopbar";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { HostelBlockProvider } from "@/components/hostel/HostelBlockContext";

export default function HostelDashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <HostelBlockProvider>
            <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 flex-col">
                <SubscriptionBanner />
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar — desktop only */}
                    <div className="hidden md:flex md:flex-shrink-0">
                        <HostelSidebar />
                    </div>
        
                    {/* Main content */}
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <HostelTopbar />
                        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 focus:outline-none">
                            <div className="py-6">
                                <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
                                    {children}
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
                <FeedbackWidget />
            </div>
        </HostelBlockProvider>
    );
}
