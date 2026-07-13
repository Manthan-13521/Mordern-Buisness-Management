// k6 Spike Test — Sudden traffic surge
// Usage: k6 run tests/performance/spike/spike.test.js
// Purpose: Verify system handles sudden traffic spikes

import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, HEADERS, ENDPOINTS } from "../load/config.js";

export const options = {
  stages: [
    { duration: "30s", target: 10 },     // Normal
    { duration: "10s", target: 200 },    // Spike!
    { duration: "30s", target: 200 },    // Sustain spike
    { duration: "30s", target: 10 },     // Recovery
    { duration: "30s", target: 0 },      // Cooldown
  ],
  thresholds: {
    http_req_duration: ["p(95)<10000"],
    http_req_failed: ["rate<0.15"],
  },
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
  });
  sleep(0.3 + Math.random() * 0.5);
}
