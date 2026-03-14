"use client";
import { Droplet, Thermometer, Waves } from "lucide-react";

export default function WaterMetricsWidget() {
    return (
        <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl backdrop-blur-xl group hover:border-neutral-700/80 transition-colors">
            <h3 className="text-xs font-bold tracking-widest uppercase text-neutral-400 flex items-center gap-2 mb-8">
                <Waves className="w-4 h-4 text-cyan-400" /> Water Quality (IoT)
            </h3>
            
            <div className="space-y-4">
                <MetricBar icon={<Droplet className="w-4 h-4" />} label="pH Level" value="7.4" max="14" safeRange="7.2 - 7.6" color="bg-cyan-500" />
                <MetricBar icon={<Thermometer className="w-4 h-4" />} label="Temperature" value="26.5°C" max="40" safeRange="25°C - 28°C" color="bg-orange-500" />
                <MetricBar icon={<Waves className="w-4 h-4" />} label="Chlorine" value="1.8 ppm" max="5" safeRange="1.0 - 3.0" color="bg-emerald-500" />
            </div>

            <button className="w-full mt-8 py-3.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-bold text-neutral-200 transition-all shadow-sm tracking-wide">
                Log Manual Adjustments
            </button>
        </div>
    );
}

function MetricBar({ icon, label, value, max, safeRange, color }: { icon: any, label: string, value: string, max: string, safeRange: string, color: string }) {
    const numericExtract = parseFloat(value);
    const percentage = numericExtract ? (numericExtract / parseFloat(max)) * 100 : 50;

    return (
        <div className="p-4 rounded-2xl bg-black/40 border border-neutral-800/50 shadow-inner group-hover:border-neutral-700/50 transition-colors">
            <div className="flex items-center justify-between mb-3 text-neutral-300">
                <div className="flex items-center gap-2.5 text-xs font-semibold tracking-wide">{icon} {label}</div>
                <div className="font-bold text-white text-sm">{value}</div>
            </div>
            <div className="h-1.5 w-full bg-black/80 rounded-full overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] mb-2.5">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(percentage, 100)}%` }} />
            </div>
            <p className="text-[10px] text-neutral-500 font-medium tracking-wide uppercase">Safe range: {safeRange}</p>
        </div>
    );
}
