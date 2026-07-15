import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { ANON_HEADERS, ALL_ENDPOINTS } from './config-v2.js';

var failureRate = new Rate('spike_failed');
var responseTime = new Trend('spike_response_time');

export var options = {
  stages: [
    { duration: '10s', target: 0 },
    { duration: '5s', target: 500 },
    { duration: '30s', target: 500 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<15000', 'p(99)<30000'],
    http_req_failed: ['rate<0.15'],
  },
  tags: { test_type: 'spike' },
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  group('Spike Test API', function() {
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
  sleep(1);
}
