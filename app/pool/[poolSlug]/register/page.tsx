import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { notFound } from "next/navigation";
import RegistrationForm from "./RegistrationForm";

export const dynamic = "force-dynamic";

export default async function PoolRegistrationPage({ params }: { params: Promise<{ poolSlug: string }> }) {
    await dbConnect();
    const { poolSlug } = await params;
    const pool = await Pool.findOne({ slug: poolSlug }).lean();
    
    // We expect pool strictly to be registered via Super Admin
    let safePool = pool as any;
    
    if (!pool) {
        // Fallback for visual mock demo if DB lacks superadmin pool
        safePool = {
            poolId: "POOL999",
            poolName: "Demo Aqua Pool",
            slug: poolSlug,
            branding: { themeColor: "#3b82f6" }
        }
    }
    
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background Lights */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] delay-700" />
            </div>

            <div 
                className="w-full max-w-xl bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative z-10 ring-1 ring-white/5"
                style={{ borderTop: `4px solid ${safePool.branding?.themeColor || '#3b82f6'}` }}
            >
                {/* Branding Banner */}
                <div className="p-10 text-center bg-white/5 border-b border-white/10">
                    {safePool.branding?.logoUrl ? (
                         <img src={safePool.branding.logoUrl} alt={safePool.poolName} className="h-16 mx-auto mb-5 rounded-2xl shadow-lg border border-white/10" />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-black border border-white/10 mx-auto mb-5 flex items-center justify-center text-xl font-bold text-slate-400 shadow-inner">
                            {safePool.poolName.charAt(0)}
                        </div>
                    )}
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2 pb-1 drop-shadow-sm">{safePool.poolName}</h1>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Member Registration</p>
                </div>

                {/* Form Wrapper */}
                <div className="p-10">
                    <RegistrationForm poolId={safePool.poolId} />
                </div>
            </div>
        </div>
    );
}
