"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

export default function UsageCounters() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/quotas")
            .then(res => res.json())
            .then(res => {
                if (res.isTrial && res.quotas) setData(res.quotas);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading || !data) return null;

    // Filter out boolean quotas like twilio
    const displayQuotas = Object.entries(data).filter(([_, q]: any) => q.limit > 1);

    if (displayQuotas.length === 0) return null;

    return (
        <div className="bg-[#0b1220] rounded-2xl border border-[#1f2937] p-5 shadow-sm">
            <h3 className="text-xs font-bold text-[#8b5cf6] mb-4 uppercase tracking-widest">
                Free Trial Usage
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayQuotas.map(([resource, q]: any) => {
                    const percent = Math.min(100, q.percentage);
                    let barColor = "bg-[#8b5cf6]";
                    let warningMsg = null;

                    if (percent >= 100) {
                        barColor = "bg-rose-500";
                        warningMsg = "Upgrade to add more.";
                    } else if (percent >= 90) {
                        barColor = "bg-rose-400";
                        warningMsg = `Only ${q.limit - q.current} remaining.`;
                    } else if (percent >= 80) {
                        barColor = "bg-amber-500";
                        warningMsg = "Approaching limit.";
                    }

                    return (
                        <div key={resource} className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-[#9ca3af] capitalize font-medium">{resource}</span>
                                <span className="font-semibold text-[#f9fafb]">
                                    {q.current} / {q.limit}
                                </span>
                            </div>
                            
                            <div className="h-2 w-full bg-[#1f2937] rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${barColor} rounded-full transition-all duration-500`} 
                                    style={{ width: `${percent}%` }}
                                />
                            </div>

                            {warningMsg && (
                                <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>{warningMsg}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
