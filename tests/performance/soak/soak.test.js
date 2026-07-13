// k6 Soak Test — Sustained load for 30+ minutes
// Usage: k6 run tests/performance/soak/soak.test.js
// Purpose: Detect memory leaks, performance degradation, and stability issues

import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, HEADERS, ENDPOINTS } from "../load/config.js";

export const options = {
  stages: [
    { duration: "2m", target: 50 },      // Ramp to target
    { duration: "30m", target: 50 },     // Soak (30 min)
    { duration: "2m", target: 0 },       // Cooldown
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"],
    http_req_failed: ["rate<0.01"],
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
  sleep(0.5 + Math.random() * 0.5);
}
