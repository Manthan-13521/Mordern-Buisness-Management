"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import clsx from "clsx";
import { useSidebar } from "@/components/providers/SidebarProvider";
import {
 LayoutDashboard,
 Users,
 CreditCard,
 ShoppingBag,
 Users2,
 Package,
 BarChart3,
 LogOut,
 Store,
 ClipboardCheck,
 FileText,
} from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";

export function BusinessSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { setOpen } = useSidebar();

  const match = pathname.match(/^\/business\/([^/]+)\/admin/);
  const businessSlug = match?.[1] ?? "";
  const base = `/business/${businessSlug}/admin`;

  const links = [
    { name: "Dashboard", href: `${base}/dashboard`, icon: LayoutDashboard },
    { name: "Customers", href: `${base}/customers`, icon: Users },
    { name: "Sales", href: `${base}/sales`, icon: ShoppingBag },
    { name: "Payments", href: `${base}/payments`, icon: CreditCard },
    { name: "Labour", href: `${base}/labour`, icon: Users2 },
    { name: "Stock", href: `${base}/stock`, icon: Package },
    { name: "Analytics", href: `${base}/analytics`, icon: BarChart3 },
    { name: "Invoice", href: `${base}/invoice`, icon: FileText },
  ];

  return (
    <div className="flex h-full w-52 flex-col bg-[#020617] text-[#f9fafb] border-r border-[#1f2937]">
      {/* Logo area */}
      <div className="flex h-16 items-center px-4 gap-3 border-b border-[#1f2937]">
        <div className="w-8 h-8 rounded-xl bg-[#0b1220] flex items-center justify-center border border-[#1f2937]">
          <Store className="w-4 h-4 text-[#8b5cf6]" />
        </div>
        <div className="overflow-hidden">
          <h1 className="text-sm font-bold truncate text-[#f9fafb]">
            {(session?.user as any)?.businessName || "Business"}
          </h1>
          <p className="text-[10px] text-[#9ca3af] font-semibold tracking-wide uppercase">Enterprise</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
        {links.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
              className={clsx(
                "group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 border-l-[3px]",
                isActive
                  ? "bg-[#8b5cf6]/10 text-white border-[#8b5cf6]"
                  : "text-[#9ca3af] border-transparent hover:text-white hover:bg-[#8b5cf6]/5"
              )}
            >
              <item.icon
                className={clsx(
                  "w-4 h-4 transition-colors duration-200",
                  isActive ? "text-white" : "text-[#9ca3af] group-hover:text-white"
                )}
              />
              <span className="text-sm font-medium tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-[#1f2937] bg-[#020617]">
        <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
          <div className="w-7 h-7 rounded-full bg-[#0b1220] flex items-center justify-center border border-[#1f2937]">
            <span className="text-[10px] font-bold text-[#f9fafb]">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] font-bold truncate text-[#f9fafb]">{session?.user?.name}</p>
            <p className="text-[9px] text-[#9ca3af] truncate">{session?.user?.role}</p>
          </div>
        </div>
        <ThemeToggle />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#9ca3af] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
