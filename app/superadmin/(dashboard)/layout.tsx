import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Super Admin Platform | Swimming Pool SaaS System",
};

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-blue-500/30">
            {/* Sidebar */}
            <aside className="w-72 bg-neutral-900/60 border-r border-neutral-800/80 p-6 flex flex-col gap-8 backdrop-blur-xl relative z-10 shadow-2xl">
                <div>
                    <h1 className="text-2xl font-black tracking-tight bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent drop-shadow-sm">
                        AquaSaaS.
                    </h1>
                    <p className="text-xs text-neutral-400 font-medium mt-1 tracking-wide uppercase">Platform Control</p>
                </div>
                <nav className="flex flex-col gap-1.5 flex-1">
                    <div className="px-3 pb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Menu</div>
                    <a href="/superadmin" className="px-4 py-2.5 rounded-xl bg-blue-600/10 text-blue-400 font-medium border border-blue-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-all flex items-center gap-3">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        Dashboard
                    </a>
                    <a href="/superadmin/pools" className="px-4 py-2.5 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3 font-medium">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Manage Pools
                    </a>
                    <a href="/superadmin/hostels" className="px-4 py-2.5 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3 font-medium">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        Manage Hostels
                    </a>
                    <a href="/superadmin/businesses" className="px-4 py-2.5 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3 font-medium">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745V6a2 2 0 012-2h14a2 2 0 012 2v7.255zM12 8a1 1 0 100-2 1 1 0 000 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 16c0 1.105 2.686 2 6 2s6-.895 6-2M6 16c0-1.105 2.686-2 6-2s6 .895 6 2m-6 2v4m-6-16h12" /></svg>
                        Manage Businesses
                    </a>
                    <a href="/superadmin/feedback" className="px-4 py-2.5 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3 font-medium">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" /></svg>
                        Reports & Feedback
                    </a>
                    <a href="/superadmin/billing" className="px-4 py-2.5 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3 font-medium">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        Billing & Invoices
                    </a>
                    <a href="/superadmin/referrals" className="px-4 py-2.5 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3 font-medium">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
                        Growth & Referrals
                    </a>
                </nav>
                <div className="pt-6 border-t border-neutral-800/80">
                    <button className="w-full px-4 py-2.5 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3 font-medium text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Log out
                    </button>
                </div>
            </aside>
            
            {/* Main Content Area with gradient backing */}
            <main className="flex-1 overflow-y-auto w-full relative">
                {/* Subtle top-left gradient orb */}
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
                
                <div className="p-10 relative z-10 w-full max-w-7xl mx-auto min-h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
