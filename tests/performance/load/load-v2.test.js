import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { ANON_HEADERS, ALL_ENDPOINTS } from './config-v2.js';

var failureRate = new Rate('failed_requests');
var responseTime = new Trend('response_time');
var totalRequests = new Counter('total_requests');

export var options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 25 },
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],
    http_req_failed: ['rate<0.05'],
  },
  tags: { test_type: 'load' },
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  group('API Endpoints', function() {
    var endpoints = ALL_ENDPOINTS;
    var batchSize = 3;
    var selected = [];
    for (var i = 0; i < batchSize; i++) {
      selected.push(pickRandom(endpoints));
    }
    var reqs = [];
    for (var i = 0; i < selected.length; i++) {
      reqs.push({
        method: selected[i].method,
        url: selected[i].url,
        headers: ANON_HEADERS,
      });
    }
    var responses = http.batch(reqs);
    for (var i = 0; i < responses.length; i++) {
      totalRequests.add(1);
      responseTime.add(responses[i].timings.duration);
      check(responses[i], {
        'status_ok': function(r) { return r.status < 500; },
        'duration_ok': function(r) { return r.timings.duration < 5000; },
      });
      if (responses[i].status >= 500) {
        failureRate.add(1);
      }
    }
  });
  sleep(1);
}
