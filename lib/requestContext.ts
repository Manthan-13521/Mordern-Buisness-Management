import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
    requestId: string;
    userId?: string;
    poolId?: string;
    hostelId?: string;
    businessId?: string;
    ip?: string;
    route?: string;
    method?: string;
    startTime: number;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
    return requestContext.getStore();
}
