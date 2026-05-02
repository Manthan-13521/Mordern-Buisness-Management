import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";

// ─────────────────────────────────────────────────────────────
// React Query Hooks for Business Data
// These hooks automatically deduplicate simultaneous API calls.
// ─────────────────────────────────────────────────────────────

export function useDashboardStats() {
    return useQuery({
        queryKey: ["business", "dashboard", "stats"],
        queryFn: ({ signal }) => apiClient.get<any>("/api/business/analytics", signal),
        staleTime: 60 * 1000, // Data fresh for 1 minute
    });
}

export function useAdvancedAnalytics(timeframe: string) {
    return useQuery({
        queryKey: ["business", "analytics", "advanced", timeframe],
        queryFn: ({ signal }) => apiClient.get<any>(`/api/business/analytics/advanced?timeframe=${timeframe}`, signal),
        staleTime: 60 * 1000,
    });
}

export function useBusinessCustomers(hasDue?: boolean) {
    return useQuery({
        queryKey: ["business", "customers", hasDue],
        queryFn: ({ signal }) => {
            const url = `/api/business/customers${hasDue ? "?hasDue=true" : ""}`;
            return apiClient.get<any[]>(url, signal);
        },
        staleTime: 30 * 1000,
    });
}

export function useBusinessLabour() {
    return useQuery({
        queryKey: ["business", "labour"],
        queryFn: ({ signal }) => apiClient.get<any[]>("/api/business/labour", signal),
        staleTime: 30 * 1000,
    });
}

export function useLabourSummary(staffId: string, type: 'business'|'pool'|'hostel' = 'business', slug?: string) {
    return useQuery({
        queryKey: [type, "labour", staffId, "summary", slug],
        queryFn: ({ signal }) => {
            let url = `/api/business/labour/${staffId}/summary`;
            if (type === 'pool') url = `/api/pool/${slug}/staff/${staffId}/summary`;
            if (type === 'hostel') url = `/api/hostel/${slug}/staff/${staffId}/summary`;
            return apiClient.get<any>(url, signal);
        },
        staleTime: 60 * 1000,
        enabled: !!staffId, // Only fetch if staffId exists
    });
}

export function useBusinessPayments() {
    return useQuery({
        queryKey: ["business", "payments"],
        queryFn: ({ signal }) => apiClient.get<any[]>("/api/business/payments", signal),
        staleTime: 30 * 1000,
    });
}

export function useBusinessSales() {
    return useQuery({
        queryKey: ["business", "sales"],
        queryFn: ({ signal }) => apiClient.get<any[]>("/api/business/sales", signal),
        staleTime: 30 * 1000,
    });
}

export function usePoolStaff(poolSlug: string) {
    return useQuery({
        queryKey: ["pool", poolSlug, "staff"],
        queryFn: ({ signal }) => apiClient.get<any[]>(`/api/pool/${poolSlug}/staff`, signal),
        staleTime: 30 * 1000,
        enabled: !!poolSlug,
    });
}

export function useHostelStaff(hostelSlug: string) {
    return useQuery({
        queryKey: ["hostel", hostelSlug, "staff"],
        queryFn: ({ signal }) => apiClient.get<any[]>(`/api/hostel/${hostelSlug}/staff`, signal),
        staleTime: 30 * 1000,
        enabled: !!hostelSlug,
    });
}
