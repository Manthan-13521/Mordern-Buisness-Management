// Shared k6 configuration
// Imported by all k6 test scripts

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

export { BASE_URL };

export const HEADERS = {
  "Content-Type": "application/json",
  ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
};

export const thresholds = {
  http_req_duration: ["p(95)<2000"],
  http_req_failed: ["rate<0.05"],
};

export const ENDPOINTS = [
  { name: "health",    url: `${BASE_URL}/api/health`,             weight: 0.10 },
  { name: "app-init",  url: `${BASE_URL}/api/app-init?test=true`,                     weight: 0.30 },
  { name: "dashboard", url: `${BASE_URL}/api/dashboard?test=true`,                    weight: 0.55 },
  { name: "members",   url: `${BASE_URL}/api/members?page=1&limit=20&test=true`,      weight: 0.80 },
  { name: "payments",  url: `${BASE_URL}/api/payments?page=1&limit=10&test=true`,     weight: 1.00 },
];
