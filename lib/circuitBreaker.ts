import CircuitBreaker from "opossum";
import { logger } from "@/lib/logger";

const options = {
  timeout: 10000, // If our function takes longer than 10 seconds, trigger a failure
  errorThresholdPercentage: 50, // When 50% of requests fail, trip the breaker
  resetTimeout: 30000 // After 30 seconds, try again
};

// ── 4.4 Circuit Breaker Factory ──
export function createBreaker<TI extends any[], TO>(
    action: (...args: TI) => Promise<TO>, 
    name: string
) {
    const breaker = new CircuitBreaker(action, options);

    breaker.on("open", () => {
        logger.warn(`[CircuitBreaker] ${name} is OPEN. Failing fast.`);
    });
    
    breaker.on("halfOpen", () => {
        logger.info(`[CircuitBreaker] ${name} is HALF_OPEN. Testing endpoint.`);
    });
    
    breaker.on("close", () => {
        logger.info(`[CircuitBreaker] ${name} is CLOSED. Resolved normally.`);
    });

    breaker.fallback(() => {
        return Promise.reject(new Error(`${name} Service Currently Unavailable. Tripped Breaker.`));
    });

    return breaker;
}
