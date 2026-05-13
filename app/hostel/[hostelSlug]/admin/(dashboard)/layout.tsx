export const dynamic = "force-dynamic";

import { HostelSidebar } from "@/components/hostel/HostelSidebar";
import { HostelTopbar } from "@/components/hostel/HostelTopbar";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { HostelBlockProvider } from "@/components/hostel/HostelBlockContext";

export default function HostelDashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <HostelBlockProvider>
            <div className="flex h-screen bg-[#020617] flex-col">
                <SubscriptionBanner />
                <div className="flex flex-1 overflow-hidden">
                    {/* Desktop Sidebar */}
                    <aside className="hidden md:flex md:w-52 md:flex-col">
                        <HostelSidebar />
                    </aside>

                    {/* Main content area */}
                    <div className="flex flex-col flex-1 min-w-0">
                        <HostelTopbar />
                        <main className="flex-1 overflow-y-auto focus:outline-none p-4 sm:p-6 lg:p-8">
                            <div className="max-w-7xl mx-auto space-y-6">
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
                <FeedbackWidget />
            </div>
        </HostelBlockProvider>
    );
}
