const http = require('http');

const CONCURRENCY = 100;
const REQUESTS_PER_CLIENT = 5;
const HOST = 'localhost';
const PORT = 3000;
const PATH = '/api/health';

let completed = 0;
let errors = 0;
let totalTime = 0;

const start = Date.now();

const makeRequest = () => {
  return new Promise((resolve) => {
    const reqStart = Date.now();
    http.get(`http://${HOST}:${PORT}${PATH}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        totalTime += (Date.now() - reqStart);
        if (res.statusCode !== 200) errors++;
        resolve();
      });
    }).on('error', (e) => {
      errors++;
      resolve();
    });
  });
};

const runClient = async () => {
  for (let i = 0; i < REQUESTS_PER_CLIENT; i++) {
    await makeRequest();
    completed++;
  }
};

const run = async () => {
  console.log(`Starting load test: ${CONCURRENCY} concurrent clients, ${REQUESTS_PER_CLIENT} reqs/client`);
  const clients = Array.from({ length: CONCURRENCY }, () => runClient());
  await Promise.all(clients);
  
  const elapsed = Date.now() - start;
  console.log(`\nResults:`);
  console.log(`Total Requests: ${completed}`);
  console.log(`Total Errors: ${errors}`);
  console.log(`Elapsed Time: ${elapsed}ms`);
  console.log(`Requests/sec: ${((completed / elapsed) * 1000).toFixed(2)}`);
  console.log(`Average Latency: ${(totalTime / completed).toFixed(2)}ms`);
};

run();
