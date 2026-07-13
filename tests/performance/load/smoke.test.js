// k6 Smoke Test — Verify basic functionality with minimal load
// Usage: k6 run tests/performance/load/smoke.test.js
// Purpose: Quick validation that all endpoints respond correctly

import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, HEADERS, thresholds } from "./config.js";

export const options = {
  vus: 1,
  duration: "30s",
  thresholds,
};

export default function () {
  const endpoints = [
    { url: `${BASE_URL}/api/health`, name: "health" },
    { url: `${BASE_URL}/api/app-init?test=true`, name: "app-init" },
    { url: `${BASE_URL}/api/dashboard?test=true`, name: "dashboard" },
    { url: `${BASE_URL}/api/members?page=1&limit=20&test=true`, name: "members" },
    { url: `${BASE_URL}/api/payments?page=1&limit=10&test=true`, name: "payments" },
  ];

  for (const ep of endpoints) {
    const res = http.get(ep.url, { headers: HEADERS });
    check(res, {
      [`${ep.name} status 200`]: (r) => r.status === 200,
      [`${ep.name} duration < 1000ms`]: (r) => r.timings.duration < 1000,
    });
    sleep(1);
  }
}
