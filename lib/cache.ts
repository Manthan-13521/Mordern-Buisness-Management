/**
 * Simple In-Memory Cache Core
 * Optimized for verifying member status and face embeddings under 200ms
 * reducing MongoDB load significantly during peak hours.
 */
class FastCache {
    private cache: Map<string, { value: any; expiry: number }> = new Map();

    set(key: string, value: any, ttlSeconds: number = 300) {
        const expiry = Date.now() + ttlSeconds * 1000;
        this.cache.set(key, { value, expiry });
    }

    get(key: string) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    delete(key: string) {
        this.cache.delete(key);
    }
    
    clear() {
        this.cache.clear();
    }
}

// Singleton export
export const memberCache = new FastCache();
