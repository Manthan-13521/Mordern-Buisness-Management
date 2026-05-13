import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { PoolTypeProvider } from "@/components/pool/PoolTypeContext";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
    params: Promise<{ poolSlug: string }>;
}) {
    return (
        <PoolTypeProvider>
            <div className="flex h-screen bg-[#020617] flex-col">
                <SubscriptionBanner />
                <div className="flex flex-1 overflow-hidden">
                    {/* Desktop Sidebar */}
                    <aside className="hidden md:flex md:w-52 md:flex-col">
                        <Sidebar />
                    </aside>

                    {/* Main content area */}
                    <div className="flex flex-col flex-1 min-w-0">
                        <Topbar />
                        <main className="flex-1 overflow-y-auto focus:outline-none p-4 sm:p-6 lg:p-8">
                            <div className="max-w-7xl mx-auto space-y-6">
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
                <FeedbackWidget />
            </div>
        </PoolTypeProvider>
    );
}
