// A simple global event emitter for triggering Quota Modals without props drilling

type QuotaEventCallback = (resource: string) => void;

class QuotaEventManager {
    private listeners: QuotaEventCallback[] = [];

    subscribe(callback: QuotaEventCallback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    emit(resource: string) {
        this.listeners.forEach(cb => cb(resource));
    }
}

export const quotaEvents = new QuotaEventManager();
