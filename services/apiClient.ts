/**
 * Centralized API Client for Business Routes
 * Helps standardize fetch headers, error handling, and response unwrapping.
 */

export const apiClient = {
    async get<T>(url: string, signal?: AbortSignal): Promise<T> {
        const res = await fetch(url, {
            cache: "no-store",
            signal,
        });
        
        const json = await res.json();
        
        if (!res.ok) {
            throw new Error(json.error || `Server error: ${res.status}`);
        }
        
        if (json.error) {
            throw new Error(json.error);
        }
        
        // Unwrap standardized API response format { data: ..., meta: ... } if present
        return json.data !== undefined ? json.data : json;
    },

    async post<T>(url: string, data: any): Promise<T> {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Server error: ${res.status}`);
        return json.data !== undefined ? json.data : json;
    }
};
