import { NextResponse } from "next/server";
import { register, httpRequestDurationMicroseconds, cacheHitCounter, apiErrorCounter, circuitBreakerState } from "@/lib/metrics";

export const dynamic = "force-dynamic";

/**
 * /api/metrics/health — Alert evaluation endpoint.
 * Returns structured health status based on Prometheus metric thresholds.
 * 
 * Polled by:
 *   - Vercel cron (every 5 min)
 *   - Uptime monitoring (Betteruptime, Pingdom)
 *   - Internal dashboard widget
 */

type AlertLevel = "healthy" | "degraded" | "critical";

interface Alert {
    name: string;
    firing: boolean;
    value: number;
    threshold: number;
    severity: "degraded" | "critical";
}

export async function GET() {
    try {
        const metrics = await register.getMetricsAsJSON();
        const alerts: Alert[] = [];

        // ── 1. API P95 Latency ────────────────────────────────────────
        const httpMetric = metrics.find(m => m.name === "http_request_duration_seconds");
        let p95Latency = 0;
        if (httpMetric && "values" in httpMetric) {
            const values = (httpMetric as any).values || [];
            const p95 = values.find((v: any) => v.labels?.quantile === 0.95 || v.labels?.le === "0.5");
            p95Latency = p95?.value || 0;
        }

        alerts.push({
            name: "api_p95_latency_degraded",
            firing: p95Latency > 0.5,
            value: Math.round(p95Latency * 1000),
            threshold: 500,
            severity: "degraded",
        });
        alerts.push({
            name: "api_p95_latency_critical",
            firing: p95Latency > 1.0,
            value: Math.round(p95Latency * 1000),
            threshold: 1000,
            severity: "critical",
        });

        // ── 2. Error Rate ─────────────────────────────────────────────
        const errorMetric = metrics.find(m => m.name === "api_errors_total");
        const httpReqMetric = metrics.find(m => m.name === "http_request_duration_seconds");
        let errorRate = 0;
        if (errorMetric && "values" in errorMetric && httpReqMetric && "values" in httpReqMetric) {
            const totalErrors = ((errorMetric as any).values || []).reduce((acc: number, v: any) => acc + (v.value || 0), 0);
            const totalReqs = ((httpReqMetric as any).values || []).reduce((acc: number, v: any) => acc + (v.value || 0), 0);
            errorRate = totalReqs > 0 ? (totalErrors / totalReqs) * 100 : 0;
        }

        alerts.push({
            name: "error_rate_degraded",
            firing: errorRate > 2,
            value: Math.round(errorRate * 100) / 100,
            threshold: 2,
            severity: "degraded",
        });
        alerts.push({
            name: "error_rate_critical",
            firing: errorRate > 5,
            value: Math.round(errorRate * 100) / 100,
            threshold: 5,
            severity: "critical",
        });

        // ── 3. Cache Hit Rate ─────────────────────────────────────────
        const cacheMetric = metrics.find(m => m.name === "cache_operations_total");
        let cacheHitRate = 100;
        if (cacheMetric && "values" in cacheMetric) {
            const values = (cacheMetric as any).values || [];
            const hits = values.filter((v: any) => v.labels?.result === "hit").reduce((acc: number, v: any) => acc + (v.value || 0), 0);
            const misses = values.filter((v: any) => v.labels?.result === "miss").reduce((acc: number, v: any) => acc + (v.value || 0), 0);
            const total = hits + misses;
            cacheHitRate = total > 0 ? (hits / total) * 100 : 100;
        }

        alerts.push({
            name: "cache_hit_rate_low",
            firing: cacheHitRate < 60,
            value: Math.round(cacheHitRate * 10) / 10,
            threshold: 60,
            severity: "degraded",
        });

        // ── 4. Circuit Breaker ─────────────────────────────────────────
        const breakerMetric = metrics.find(m => m.name === "circuit_breaker_state");
        let razorpayBreakerOpen = false;
        if (breakerMetric && "values" in breakerMetric) {
            const values = (breakerMetric as any).values || [];
            const rzpBreaker = values.find((v: any) => v.labels?.service === "razorpay-orders");
            if (rzpBreaker && rzpBreaker.value === 1) razorpayBreakerOpen = true;
        }

        alerts.push({
            name: "razorpay_circuit_breaker_open",
            firing: razorpayBreakerOpen,
            value: razorpayBreakerOpen ? 1 : 0,
            threshold: 1,
            severity: "critical",
        });

        // ── Determine overall status ──────────────────────────────────
        const firingAlerts = alerts.filter(a => a.firing);
        let status: AlertLevel = "healthy";
        if (firingAlerts.some(a => a.severity === "critical")) {
            status = "critical";
        } else if (firingAlerts.some(a => a.severity === "degraded")) {
            status = "degraded";
        }

        return NextResponse.json({
            status,
            alerts,
            checkedAt: new Date().toISOString(),
        }, {
            headers: { "Cache-Control": "no-store" },
        });

    } catch (error) {
        console.error("[GET /api/metrics/health]", error);
        return NextResponse.json({
            status: "critical",
            alerts: [{ name: "health_check_failed", firing: true, value: 1, threshold: 0, severity: "critical" }],
            error: "Health check failed",
        }, { status: 500 });
    }
}
