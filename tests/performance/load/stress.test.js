import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { ANON_HEADERS, ALL_ENDPOINTS } from './config-v2.js';

var failureRate = new Rate('stress_failed');
var responseTime = new Trend('stress_response_time');

export var options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000', 'p(99)<30000'],
    http_req_failed: ['rate<0.10'],
  },
  tags: { test_type: 'stress' },
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  group('Stress Test API', function() {
    var ep = pickRandom(ALL_ENDPOINTS);
    var res = http.get(ep.url, { headers: ANON_HEADERS });
    responseTime.add(res.timings.duration);
    check(res, {
      'status_ok': function(r) { return r.status < 500; },
      'duration_ok': function(r) { return r.timings.duration < 10000; },
    });
    if (res.status >= 500) {
      failureRate.add(1);
    }
  });
  sleep(0.5);
}
