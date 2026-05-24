import React from "react";
import clsx from "clsx";

export const SAInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        className={clsx(
            "w-full bg-[var(--sa-bg-input)] border border-[var(--sa-border)] rounded-lg px-3 py-2 text-sm text-[var(--sa-text-primary)] outline-none focus:border-[var(--sa-accent)] focus:ring-1 focus:ring-[var(--sa-accent)] transition-all placeholder:text-[var(--sa-text-disabled)]",
            className
        )}
        {...props}
    />
));
SAInput.displayName = "SAInput";

export const SASelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
    <select
        ref={ref}
        className={clsx(
            "w-full bg-[var(--sa-bg-input)] border border-[var(--sa-border)] rounded-lg px-3 py-2 text-sm text-[var(--sa-text-primary)] outline-none focus:border-[var(--sa-accent)] focus:ring-1 focus:ring-[var(--sa-accent)] transition-all",
            className
        )}
        {...props}
    />
));
SASelect.displayName = "SASelect";

export const SATextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
    <textarea
        ref={ref}
        className={clsx(
            "w-full bg-[var(--sa-bg-input)] border border-[var(--sa-border)] rounded-lg px-3 py-2 text-sm text-[var(--sa-text-primary)] outline-none resize-none focus:border-[var(--sa-accent)] focus:ring-1 focus:ring-[var(--sa-accent)] transition-all placeholder:text-[var(--sa-text-disabled)]",
            className
        )}
        {...props}
    />
));
SATextarea.displayName = "SATextarea";

export function SALabel({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
    return (
        <label className={clsx("block text-[10px] sm:text-xs uppercase font-bold text-[var(--sa-text-muted)] mb-1.5 tracking-wider", className)} {...props}>
            {children}
        </label>
    );
}
