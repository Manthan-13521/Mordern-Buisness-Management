"use client";

import { useSidebar } from "@/components/providers/SidebarProvider";
import { BusinessSidebar } from "./BusinessSidebar";

export function MobileDrawer() {
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-52
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:hidden
        `}
      >
        <div className="flex h-full flex-col shadow-2xl">
          <BusinessSidebar />
        </div>
      </div>
    </>
  );
}
