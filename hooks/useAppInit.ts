"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Hook: useAppInit
 * 
 * Fetches consolidated dashboard data from /api/app-init in a single call.
 * Seeds individual query caches so downstream components work unchanged.
 * Replaces 3 separate API calls (dashboard + members + payments).
 */

export function useAppInit(poolId: string | undefined) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ["app-init", poolId],
        queryFn: async () => {
            const res = await fetch("/api/app-init");
            if (!res.ok) throw new Error("Failed to load app data");
            return res.json();
        },
        staleTime: 10_000,
        gcTime: 30_000,
        enabled: !!poolId,
        refetchOnWindowFocus: true,
        retry: 2,
    });

    // Seed individual query caches from consolidated response
    useEffect(() => {
        if (!query.data || !poolId) return;

        const { dashboard, members, payments } = query.data;

        if (dashboard) {
            queryClient.setQueryData(["dashboard", poolId], dashboard);
        }
        if (members) {
            queryClient.setQueryData(["members", "list", poolId, 1], members);
        }
        if (payments) {
            queryClient.setQueryData(["payments", poolId], payments);
        }
    }, [query.data, poolId, queryClient]);

    return query;
}
