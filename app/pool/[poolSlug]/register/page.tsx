import connectDB from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { notFound } from "next/navigation";
import RegistrationForm from "./RegistrationForm";

export const dynamic = "force-dynamic";

export default async function PoolRegistrationPage({ params }: { params: Promise<{ poolSlug: string }> }) {
    await connectDB();
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
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background Lights */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] pointer-events-none" style={{ backgroundColor: safePool.branding?.themeColor || '#3b82f6', opacity: 0.15 }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] pointer-events-none" />

            <div 
                className="w-full max-w-xl bg-neutral-900/80 backdrop-blur-3xl border border-neutral-800/80 rounded-[2rem] overflow-hidden shadow-2xl relative z-10"
                style={{ borderTop: `4px solid ${safePool.branding?.themeColor || '#3b82f6'}` }}
            >
                {/* Branding Banner */}
                <div className="p-10 text-center bg-gradient-to-b from-black/60 to-transparent border-b border-neutral-800/50">
                    {safePool.branding?.logoUrl ? (
                         <img src={safePool.branding.logoUrl} alt={safePool.poolName} className="h-16 mx-auto mb-5 rounded-2xl shadow-lg border border-neutral-800" />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neutral-800 to-black border border-neutral-700/80 mx-auto mb-5 flex items-center justify-center text-xl font-bold text-neutral-400 shadow-inner">
                            {safePool.poolName.charAt(0)}
                        </div>
                    )}
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2 pb-1 drop-shadow-sm">{safePool.poolName}</h1>
                    <p className="text-neutral-400 text-sm font-medium uppercase tracking-widest">Member Registration</p>
                </div>

                {/* Form Wrapper */}
                <div className="p-10">
                    <RegistrationForm poolId={safePool.poolId} />
                </div>
            </div>
        </div>
    );
}
