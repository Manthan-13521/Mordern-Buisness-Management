import React from "react";
import clsx from "clsx";

export function SABadge({
    children,
    variant = "neutral",
    className
}: {
    children: React.ReactNode;
    variant?: "success" | "warning" | "danger" | "info" | "neutral" | "accent" | "primary";
    className?: string;
}) {
    const variants = {
        success: "bg-[var(--sa-success-muted)] text-[var(--sa-success)] border border-[var(--sa-success-muted)]",
        warning: "bg-[var(--sa-warning-muted)] text-[var(--sa-warning)] border border-[var(--sa-warning-muted)]",
        danger: "bg-[var(--sa-danger-muted)] text-[var(--sa-danger)] border border-[var(--sa-danger-muted)]",
        info: "bg-[var(--sa-info-muted)] text-[var(--sa-info)] border border-[var(--sa-info-muted)]",
        neutral: "bg-[var(--sa-bg-elevated)] text-[var(--sa-text-muted)] border border-[var(--sa-border)]",
        accent: "bg-[var(--sa-accent-muted)] text-[var(--sa-accent)] border border-[var(--sa-accent-muted)]",
        primary: "bg-[var(--sa-accent-muted)] text-[var(--sa-accent)] border border-[var(--sa-accent-muted)]",
    };

    return (
        <span className={clsx(
            "inline-flex items-center px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider",
            variants[variant],
            className
        )}>
            {children}
        </span>
    );
}
