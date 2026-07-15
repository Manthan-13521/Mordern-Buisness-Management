import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { ANON_HEADERS, ALL_ENDPOINTS } from './config-v2.js';

var failureRate = new Rate('soak_failed');
var responseTime = new Trend('soak_response_time');

export var options = {
  stages: [
    { duration: '5m', target: 30 },
    { duration: '60m', target: 30 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<15000'],
    http_req_failed: ['rate<0.05'],
  },
  tags: { test_type: 'soak' },
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  group('Soak Test API', function() {
    var ep = pickRandom(ALL_ENDPOINTS);
    var res = http.get(ep.url, { headers: ANON_HEADERS });
    responseTime.add(res.timings.duration);
    check(res, {
      'status_ok': function(r) { return r.status < 500; },
    });
    if (res.status >= 500) {
      failureRate.add(1);
    }
  });
  sleep(3);
}
