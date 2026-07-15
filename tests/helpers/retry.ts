/**
 * retry.ts
 * Purpose: Retry flaky async operations with configurable backoff.
 * Usage: const result = await retry(() => fetch(url), { maxRetries: 3, baseDelay: 1000 });
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoff?: 'linear' | 'exponential';
  retryOn?: (error: any) => boolean;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 500, maxDelay = 10000, backoff = 'exponential', retryOn = () => true } = options;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries || !retryOn(error)) throw error;
      const delay = backoff === 'exponential'
        ? Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
        : baseDelay;
      console.log(`[Retry] Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}
