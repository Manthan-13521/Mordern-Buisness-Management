// k6 Chaos Test — Test with degraded external services
// Usage: k6 run tests/performance/chaos/chaos.test.js
// Purpose: Verify graceful degradation when dependencies fail

import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, HEADERS } from "../load/config.js";

export const options = {
  vus: 20,
  duration: "3m",
  thresholds: {
    http_req_duration: ["p(95)<10000"],
    http_req_failed: ["rate<0.20"],
  },
};

export default function () {
  // Simulate various failure scenarios
  const scenarios = [
    // Normal request
    () => http.get(`${BASE_URL}/api/health`, { headers: HEADERS }),
    // Request that triggers DB query
    () => http.get(`${BASE_URL}/api/members?page=1&limit=5&test=true`, { headers: HEADERS }),
    // Request with timeout-style behavior
    () => http.get(`${BASE_URL}/api/dashboard?test=true&chaos=true`, { headers: HEADERS }),
  ];

  const fn = scenarios[Math.floor(Math.random() * scenarios.length)];
  const res = fn();

  check(res, {
    "chaos: service responds": (r) => r.status !== 0, // Not a network error
    "chaos: graceful degradation": (r) => r.status < 500 || r.status === 503,
  });

  sleep(0.5 + Math.random() * 0.5);
}
