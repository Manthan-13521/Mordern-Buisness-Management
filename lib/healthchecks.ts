import { NextResponse } from "next/server";

export interface HealthcheckOptions {
    checkName: string;
    /**
     * Expected duration max in milliseconds before enforcing a timeout.
     * Defaults to 25000 (25s) to safely fit within Vercel's 30s limit.
     */
    timeoutMs?: number; 
}

const RETRY_DELAYS = [200, 500, 1000];

// ── Parse HEALTHCHECKS once at module load (not on every invocation) ──────────
// In a Vercel Serverless Function, env vars are frozen at deploy time.
// Parsing on every call wastes CPU on every cron execution.
let _configCache: Record<string, string> | null = null;

function getHealthcheckConfig(): Record<string, string> {
    if (_configCache !== null) return _configCache;
    const envValue = process.env.HEALTHCHECKS;
    if (!envValue) {
        _configCache = {};
        return _configCache;
    }
    try {
        _configCache = JSON.parse(envValue);
    } catch {
        console.warn(`[Healthcheck] Warning: Failed to parse HEALTHCHECKS environment variable.`);
        _configCache = {};
    }
    return _configCache!;
}

async function pingWithRetry(url: string, method: 'GET' | 'POST' = 'GET', body?: string): Promise<boolean> {
    for (let i = 0; i <= RETRY_DELAYS.length; i++) {
        try {
            const options: RequestInit = { method, keepalive: true };
            if (body) {
                options.body = body;
            }
            const res = await fetch(url, options);
            if (res.ok) return true;
        } catch (err) {
            // Network or fetch error, will retry
        }
        
        if (i < RETRY_DELAYS.length) {
            await new Promise(r => setTimeout(r, RETRY_DELAYS[i]));
        }
    }
    return false;
}

export async function withHealthcheck<T>(
    options: HealthcheckOptions | string, 
    cronLogic: () => Promise<T>
): Promise<T> {
    const checkName = typeof options === 'string' ? options : options.checkName;
    const timeoutMs = typeof options === 'string' ? 25000 : (options.timeoutMs || 25000); 
    
    // 1. Resolve config from singleton cache (parsed once at module load)
    const config = getHealthcheckConfig();
    const baseUrl = config[checkName];
    
    // 2. Unconfigured Behavior
    if (!baseUrl) {
        console.warn(`[Healthcheck] Warning: Healthcheck URL missing | Cron: ${checkName} | Continuing execution...`);
        const startTime = performance.now();
        try {
            const res = await cronLogic();
            const duration = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`[Healthcheck] Cron: ${checkName} | Started | Completed | Duration: ${duration}s`);
            return res;
        } catch (err: any) {
            const duration = ((performance.now() - startTime) / 1000).toFixed(2);
            console.error(`[Healthcheck] Cron: ${checkName} | Started | Failed | Duration: ${duration}s | Error: ${err.message}`);
            throw err;
        }
    }

    // 3. Monitored Behavior
    const startTime = performance.now();
    
    // Await start ping
    const startPingSuccess = await pingWithRetry(`${baseUrl}/start`);
    
    let isTimeout = false;
    let cronError: any = null;
    let result: T | undefined;
    let timeoutId: NodeJS.Timeout | undefined;

    try {
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                isTimeout = true;
                reject(new Error(`Timeout: Cron exceeded expected duration of ${timeoutMs}ms`));
            }, timeoutMs);
        });

        result = await Promise.race([cronLogic(), timeoutPromise]);
    } catch (err) {
        cronError = err;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    
    if (cronError) {
        // Send fail
        const failMessage = cronError instanceof Error ? cronError.stack || cronError.message : String(cronError);
        const failPingSuccess = await pingWithRetry(`${baseUrl}/fail`, 'POST', failMessage.slice(0, 9000)); // HC max body 10KB
        
        console.error(JSON.stringify({
            event: "Healthcheck Failed",
            cron: checkName,
            status: isTimeout ? 'Timeout' : 'Failed',
            durationSec: duration,
            pingStart: startPingSuccess ? 'Success' : 'Failed',
            pingFail: failPingSuccess ? 'Success' : 'Failed',
            error: cronError instanceof Error ? cronError.message : String(cronError)
        }, null, 2));
        
        throw cronError;
    } else {
        // Send success
        const successPingSuccess = await pingWithRetry(baseUrl);
        
        console.log(JSON.stringify({
            event: "Healthcheck Success",
            cron: checkName,
            status: 'Completed',
            durationSec: duration,
            pingStart: startPingSuccess ? 'Success' : 'Failed',
            pingSuccess: successPingSuccess ? 'Success' : 'Failed'
        }, null, 2));

        return result as T;
    }
}
