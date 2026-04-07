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
        <div className="flex h-screen overflow-hidden bg-background flex-col">
            <SubscriptionBanner />
            <div className="flex flex-1 overflow-hidden">
                <PoolTypeProvider>
                    {/* Sidebar for desktop */}
                    <div className="hidden md:flex md:flex-shrink-0">
                        <Sidebar />
                    </div>
        
                    {/* Main content area */}
                    <div className="flex w-0 flex-1 flex-col overflow-hidden">
                        <Topbar />
        
                        <main className="relative flex-1 overflow-y-auto focus:outline-none bg-background text-foreground">
                            <div className="py-6">
                                <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
                                    {children}
                                </div>
                            </div>
                        </main>
                    </div>
                </PoolTypeProvider>
            </div>
            <FeedbackWidget />
        </div>
    );
}
