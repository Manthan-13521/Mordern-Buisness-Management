// k6 Load Test — Progressive load from 1 to 100 VUs
// Usage: k6 run tests/performance/load/load.test.js
// Purpose: Measure system performance under increasing load

import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, HEADERS, thresholds, ENDPOINTS } from "./config.js";

export const options = {
  stages: [
    { duration: "30s", target: 10 },    // Ramp to 10
    { duration: "1m", target: 10 },     // Hold
    { duration: "30s", target: 25 },    // Ramp to 25
    { duration: "1m", target: 25 },     // Hold
    { duration: "30s", target: 50 },    // Ramp to 50
    { duration: "2m", target: 50 },     // Hold
    { duration: "30s", target: 100 },   // Ramp to 100
    { duration: "2m", target: 100 },    // Hold
    { duration: "30s", target: 0 },     // Cooldown
  ],
  thresholds,
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
    "duration < 5000ms": (r) => r.timings.duration < 5000,
  });
  sleep(0.3 + Math.random() * 0.5);
}
