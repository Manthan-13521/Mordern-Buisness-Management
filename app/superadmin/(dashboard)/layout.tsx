import { Metadata } from "next";
import { SuperAdminSidebar } from "@/components/superadmin/SuperAdminSidebar";
import { SuperAdminTopbar } from "@/components/superadmin/SuperAdminTopbar";

export const metadata: Metadata = {
    title: "Super Admin Platform | AquaSync SaaS",
};

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-[#020617]">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:w-52 md:flex-col">
                <SuperAdminSidebar />
            </aside>

            {/* Main Content */}
            <div className="flex flex-col flex-1 min-w-0">
                <SuperAdminTopbar />
                <main className="flex-1 overflow-y-auto focus:outline-none p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
