import React from "react";
import clsx from "clsx";

interface SACardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "elevated" | "interactive";
    padding?: "none" | "sm" | "md" | "lg";
}

export function SACard({
    children,
    className,
    variant = "default",
    padding = "md",
    ...props
}: SACardProps) {
    const baseStyles = "bg-[var(--sa-bg-card)] rounded-2xl transition-colors duration-200 border";
    
    const variants = {
        default: "border-[var(--sa-border)] shadow-sm",
        elevated: "border-[var(--sa-border)] shadow-md shadow-black/5",
        interactive: "border-[var(--sa-border)] shadow-sm hover:border-[var(--sa-border-active)] hover:bg-[var(--sa-bg-card-hover)] cursor-pointer",
    };

    const paddings = {
        none: "",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
    };

    return (
        <div
            className={clsx(
                baseStyles,
                variants[variant],
                paddings[padding],
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
