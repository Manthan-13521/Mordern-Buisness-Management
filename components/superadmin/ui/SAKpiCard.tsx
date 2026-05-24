import React from "react";
import clsx from "clsx";

interface SAKpiCardProps {
    title: string;
    value: string | React.ReactNode;
    icon: React.ReactNode;
    color?: "emerald" | "blue" | "green" | "amber" | "red" | "purple";
    subtitle?: string;
    trend?: {
        value: number;
        isPositive: boolean;
        label: string;
    };
    className?: string;
}

export function SAKpiCard({
    title,
    value,
    icon,
    color = "blue",
    subtitle,
    trend,
    className
}: SAKpiCardProps) {
    const colorStyles = {
        emerald: "from-[var(--sa-success-muted)] to-transparent border-[var(--sa-success-muted)] text-[var(--sa-success)]",
        blue: "from-[var(--sa-info-muted)] to-transparent border-[var(--sa-info-muted)] text-[var(--sa-info)]",
        green: "from-[var(--sa-success-muted)] to-transparent border-[var(--sa-success-muted)] text-[var(--sa-success)]",
        amber: "from-[var(--sa-warning-muted)] to-transparent border-[var(--sa-warning-muted)] text-[var(--sa-warning)]",
        red: "from-[var(--sa-danger-muted)] to-transparent border-[var(--sa-danger-muted)] text-[var(--sa-danger)]",
        purple: "from-[var(--sa-accent-muted)] to-transparent border-[var(--sa-accent-muted)] text-[var(--sa-accent)]",
    };

    const activeColor = colorStyles[color];

    return (
        <div className={clsx(
            "p-5 rounded-2xl bg-gradient-to-br bg-[var(--sa-bg-card)] border border-[var(--sa-border)] flex flex-col gap-3 transition-all duration-300 hover:shadow-lg hover:border-[var(--sa-border-active)] group relative overflow-hidden",
            className
        )}>
            {/* Subtle background glow effect based on color */}
            <div className={clsx("absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl opacity-20 group-hover:opacity-30 transition-opacity rounded-bl-full pointer-events-none", activeColor.split(' ')[0])} />

            <div className="flex items-center justify-between relative z-10">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--sa-text-muted)]">{title}</span>
                <div className={clsx("p-2 rounded-lg bg-gradient-to-br", activeColor.split(' ')[0], activeColor.split(' ')[2])}>
                    {icon}
                </div>
            </div>
            
            <div className="relative z-10">
                <div className="text-2xl font-bold text-[var(--sa-text-primary)] tracking-tight">{value}</div>
                
                {trend && (
                    <div className="flex items-center gap-1.5 mt-2">
                        <span className={clsx(
                            "text-xs font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5",
                            trend.isPositive ? "text-[var(--sa-success)] bg-[var(--sa-success-muted)]" : "text-[var(--sa-danger)] bg-[var(--sa-danger-muted)]"
                        )}>
                            {trend.isPositive ? "↑" : "↓"} {trend.value}%
                        </span>
                        <span className="text-[10px] font-medium text-[var(--sa-text-muted)] uppercase tracking-wider">
                            {trend.label}
                        </span>
                    </div>
                )}

                {subtitle && !trend && (
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sa-text-disabled)] mt-2">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
