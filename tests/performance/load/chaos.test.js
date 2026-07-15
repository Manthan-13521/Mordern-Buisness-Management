import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { ANON_HEADERS, ALL_ENDPOINTS } from './config-v2.js';

var failureRate = new Rate('chaos_failed');
var responseTime = new Trend('chaos_response_time');

export var options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 20 },
    { duration: '2m', target: 40 },
    { duration: '2m', target: 80 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 150 },
    { duration: '30s', target: 5 },
    { duration: '2m', target: 60 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<15000', 'p(99)<30000'],
    http_req_failed: ['rate<0.20'],
  },
  tags: { test_type: 'chaos' },
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  group('Chaos Test API', function() {
    var count = Math.floor(Math.random() * 5) + 1;
    var requests = [];
    for (var i = 0; i < count; i++) {
      var ep_ = pickRandom(ALL_ENDPOINTS);
      requests.push({
        method: ep_.method,
        url: ep_.url,
        headers: ANON_HEADERS,
      });
    }
    var responses = http.batch(requests);
    for (var i = 0; i < responses.length; i++) {
      responseTime.add(responses[i].timings.duration);
      check(responses[i], {
        'status_ok': function(r) { return r.status < 500; },
      });
      if (responses[i].status >= 500) {
        failureRate.add(1);
      }
    }
  });
  sleep(Math.random() * 2);
}
