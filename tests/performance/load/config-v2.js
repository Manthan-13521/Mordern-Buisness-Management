var BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export { BASE_URL };

export var ANON_HEADERS = {
  "Content-Type": "application/json",
};

export var ENDPOINTS = {
  health: [
    { name: "health",       url: BASE_URL + "/api/health",             method: "GET", weight: 0.5 },
    { name: "health-live",  url: BASE_URL + "/api/health/live",        method: "GET", weight: 0.3 },
    { name: "health-ready", url: BASE_URL + "/api/health/ready",       method: "GET", weight: 0.2 },
  ],
  pool: [
    { name: "pool-dashboard",   url: BASE_URL + "/api/dashboard",                      method: "GET", weight: 1.0 },
    { name: "pool-members",     url: BASE_URL + "/api/members?page=1&limit=20",        method: "GET", weight: 1.0 },
    { name: "pool-payments",    url: BASE_URL + "/api/payments?page=1&limit=10",       method: "GET", weight: 0.7 },
    { name: "pool-plans",       url: BASE_URL + "/api/plans",                          method: "GET", weight: 0.6 },
    { name: "pool-staff",       url: BASE_URL + "/api/staff",                          method: "GET", weight: 0.5 },
    { name: "pool-occupancy",   url: BASE_URL + "/api/occupancy",                      method: "GET", weight: 0.8 },
    { name: "pool-capacity",    url: BASE_URL + "/api/settings/capacity",              method: "GET", weight: 0.6 },
    { name: "pool-members-expired", url: BASE_URL + "/api/members/expired",            method: "GET", weight: 0.4 },
  ],
  hostel: [
    { name: "hostel-dashboard", url: BASE_URL + "/api/hostel/dashboard",              method: "GET", weight: 1.0 },
    { name: "hostel-members",   url: BASE_URL + "/api/hostel/members?page=1",         method: "GET", weight: 1.0 },
    { name: "hostel-plans",     url: BASE_URL + "/api/hostel/plans",                  method: "GET", weight: 0.6 },
    { name: "hostel-payments",  url: BASE_URL + "/api/hostel/payments",               method: "GET", weight: 0.6 },
    { name: "hostel-staff",     url: BASE_URL + "/api/hostel/staff",                  method: "GET", weight: 0.5 },
    { name: "hostel-rooms",     url: BASE_URL + "/api/hostel/rooms",                  method: "GET", weight: 0.5 },
    { name: "hostel-settings",  url: BASE_URL + "/api/hostel/settings",               method: "GET", weight: 0.3 },
  ],
  business: [
    { name: "biz-info",        url: BASE_URL + "/api/business/info",                  method: "GET", weight: 1.0 },
    { name: "biz-analytics",   url: BASE_URL + "/api/business/analytics",             method: "GET", weight: 0.8 },
    { name: "biz-customers",   url: BASE_URL + "/api/business/customers",             method: "GET", weight: 0.7 },
    { name: "biz-sales",       url: BASE_URL + "/api/business/sales",                 method: "GET", weight: 0.6 },
    { name: "biz-stock",       url: BASE_URL + "/api/business/stock",                 method: "GET", weight: 0.5 },
    { name: "biz-labour",      url: BASE_URL + "/api/business/labour",                method: "GET", weight: 0.5 },
    { name: "biz-transactions", url: BASE_URL + "/api/business/transactions",         method: "GET", weight: 0.6 },
  ],
  analytics: [
    { name: "analytics-summary",        url: BASE_URL + "/api/analytics/summary",     method: "GET", weight: 1.0 },
    { name: "analytics-monthly-members", url: BASE_URL + "/api/analytics/monthly-members", method: "GET", weight: 0.8 },
    { name: "analytics-monthly-income",  url: BASE_URL + "/api/analytics/monthly-income",  method: "GET", weight: 0.8 },
    { name: "analytics-defaulters",      url: BASE_URL + "/api/analytics/defaulters", method: "GET", weight: 0.6 },
    { name: "analytics-trends",          url: BASE_URL + "/api/analytics/trends",     method: "GET", weight: 0.5 },
  ],
  superadmin: [
    { name: "sa-dashboard",     url: BASE_URL + "/api/superadmin/dashboard",          method: "GET", weight: 1.0 },
    { name: "sa-pools",         url: BASE_URL + "/api/superadmin/pools",              method: "GET", weight: 0.8 },
    { name: "sa-hostels",       url: BASE_URL + "/api/superadmin/hostels",            method: "GET", weight: 0.8 },
    { name: "sa-businesses",    url: BASE_URL + "/api/superadmin/businesses",         method: "GET", weight: 0.8 },
    { name: "sa-feedback",      url: BASE_URL + "/api/superadmin/feedback",           method: "GET", weight: 0.4 },
    { name: "sa-referrals",     url: BASE_URL + "/api/superadmin/referrals",          method: "GET", weight: 0.4 },
  ],
};

function flattenEndpoints() {
  var all = [];
  var moduleKeys = Object.keys(ENDPOINTS);
  for (var m = 0; m < moduleKeys.length; m++) {
    var module = ENDPOINTS[moduleKeys[m]];
    for (var e = 0; e < module.length; e++) {
      all.push(module[e]);
    }
  }
  return all;
}

export var ALL_ENDPOINTS = flattenEndpoints();
