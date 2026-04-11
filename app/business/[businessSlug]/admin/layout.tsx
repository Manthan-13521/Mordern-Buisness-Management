import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { BusinessTopbar } from "@/components/business/BusinessTopbar";
import { SidebarProvider } from "@/components/providers/SidebarProvider";

export default function BusinessLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return (
  <SidebarProvider>
   <div className="flex h-screen bg-[#020617]">
    {/* Desktop Sidebar */}
    <aside className="hidden md:flex md:w-52 md:flex-col">
     <BusinessSidebar />
    </aside>

    {/* Mobile Sidebar Drawer */}
    <MobileDrawer />

    {/* Main Content */}
    <div className="flex flex-col flex-1 min-w-0">
     <BusinessTopbar />
     <main className="flex-1 overflow-y-auto focus:outline-none p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
       {children}
      </div>
     </main>
    </div>
   </div>
  </SidebarProvider>
 );
}

// ── Mobile Sidebar Drawer (extracted here for co-location) ──────────────
import { MobileDrawer } from "@/components/business/MobileDrawer";
