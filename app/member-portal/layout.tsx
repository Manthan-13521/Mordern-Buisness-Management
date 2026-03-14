import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Member Portal | Swimming Pool System",
};

export default function MemberPortalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col selection:bg-blue-500/30">
            <header className="h-[72px] border-b border-neutral-800/80 bg-black/50 backdrop-blur-xl sticky top-0 z-50 flex items-center px-10 justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-lg shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]">M</div>
                    <div>
                        <span className="font-bold tracking-wide block leading-none">Member Portal</span>
                        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">Hyd Aqua Pool</span>
                    </div>
                </div>
                <button className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">Sign Out 👋</button>
            </header>
            <main className="flex-1 p-6 md:p-12 relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-500/10 blur-[120px] pointer-events-none rounded-full" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-500/5 blur-[120px] pointer-events-none rounded-full" />
                <div className="w-full max-w-6xl relative z-10 flex-1 flex flex-col">
                    {children}
                </div>
            </main>
        </div>
    );
}
