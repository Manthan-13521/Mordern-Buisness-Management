// k6 Stress Test — Ramp up until system breaks
// Usage: k6 run tests/performance/stress/stress.test.js
// Purpose: Identify the breaking point of the system

import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, HEADERS, ENDPOINTS } from "../load/config.js";

export const options = {
  stages: [
    { duration: "1m", target: 50 },     // Warm-up
    { duration: "2m", target: 100 },    // Normal peak
    { duration: "2m", target: 150 },    // Above expected
    { duration: "2m", target: 200 },    // Stress
    { duration: "2m", target: 250 },    // Breaking point
    { duration: "1m", target: 0 },      // Cooldown
  ],
  thresholds: {
    http_req_duration: ["p(95)<10000"],  // More lenient for stress
    http_req_failed: ["rate<0.10"],      // Allow some failures
  },
  discardResponseBodies: false,
};

export default function () {
  const rand = Math.random();
  let selected = ENDPOINTS[ENDPOINTS.length - 1];

  for (const ep of ENDPOINTS) {
    if (rand < ep.weight) {
      selected = ep;
      break;
    }
  }

  const res = http.get(selected.url, { headers: HEADERS });
  check(res, {
    "status is 200": (r) => r.status === 200,
    "no server error": (r) => r.status < 500,
  });
  sleep(0.05 + Math.random() * 0.2);
}
