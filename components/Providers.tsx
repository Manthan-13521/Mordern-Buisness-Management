"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./ThemeProvider";
import { PRIVATE_API_STALE_MS } from "@/lib/apiCache";

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: PRIVATE_API_STALE_MS,
                        gcTime: 5 * 60 * 1000,
                        refetchOnWindowFocus: true, // Auto-update if they switch tabs
                        refetchOnMount: "always", // Enforce Phase 8
                        refetchOnReconnect: true,
                        retry: 1,
                    },
                },
            })
    );

    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <SessionProvider refetchOnWindowFocus={false}>
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            </SessionProvider>
        </ThemeProvider>
    );
}
