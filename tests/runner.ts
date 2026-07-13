/*
 * ========================================================================
 * MAIN TEST RUNNER
 * ========================================================================
 *
 * Purpose:
 *   Orchestrates execution of all test suites across the AquaSync testing
 *   ecosystem. Runs API tests, middleware tests, security tests,
 *   integration tests, and edge case tests in sequence.
 *
 * Usage:
 *   npx tsx tests/runner.ts
 *   npx tsx tests/runner.ts --module=auth    # Run specific module
 *   npx tsx tests/runner.ts --coverage       # Show coverage estimates
 *
 * Expected Behavior:
 *   - All test suites execute and report pass/fail
 *   - Summary table printed at end
 *   - Exit code 0 = all passed, 1 = some failed
 *
 * Estimated Execution Time: 5-10 minutes
 * Author: Enterprise QA
 * Last Updated: 2026-07-13
 * ========================================================================
 */

import { execSync } from "child_process";
import path from "path";

interface TestSuite {
  name: string;
  path: string;
  estimatedMs: number;
}

const SUITES: TestSuite[] = [
  // Auth
  { name: "Auth API", path: "api/auth/auth.test.ts", estimatedMs: 30000 },
  // Core Pool
  { name: "Pool API", path: "api/pool/pool.test.ts", estimatedMs: 45000 },
  // Members
  { name: "Members API", path: "api/members/members.test.ts", estimatedMs: 60000 },
  // Hostel
  { name: "Hostel API", path: "api/hostel/hostel.test.ts", estimatedMs: 90000 },
  // Business
  { name: "Business API", path: "api/business/business.test.ts", estimatedMs: 60000 },
  // Payments
  { name: "Payments API", path: "api/payments/payments.test.ts", estimatedMs: 45000 },
  // SuperAdmin
  { name: "SuperAdmin API", path: "api/superadmin/superadmin.test.ts", estimatedMs: 45000 },
  // Entry & Occupancy
  { name: "Entry/Occupancy API", path: "api/entry/entry.test.ts", estimatedMs: 30000 },
  // Analytics
  { name: "Analytics API", path: "api/analytics/analytics.test.ts", estimatedMs: 30000 },
  // Middleware
  { name: "Middleware", path: "middleware/middleware.test.ts", estimatedMs: 20000 },
  // Security
  { name: "Security", path: "security/security.test.ts", estimatedMs: 60000 },
  // Edge Cases
  { name: "Edge Cases", path: "api/edge/edge.test.ts", estimatedMs: 30000 },
  // Integration
  { name: "Integration: Database", path: "integration/database/database.test.ts", estimatedMs: 30000 },
  { name: "Integration: Redis", path: "integration/redis/redis.test.ts", estimatedMs: 20000 },
  { name: "Integration: Razorpay", path: "integration/razorpay/razorpay.test.ts", estimatedMs: 20000 },
];

interface SuiteResult {
  name: string;
  passed: boolean;
  durationMs: number;
  output: string;
}

function runSuite(suite: TestSuite): SuiteResult {
  const start = Date.now();
  const fullPath = path.join(__dirname, suite.path);

  try {
    const output = execSync(`npx tsx "${fullPath}"`, {
      encoding: "utf-8",
      timeout: suite.estimatedMs * 3,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return {
      name: suite.name,
      passed: true,
      durationMs: Date.now() - start,
      output,
    };
  } catch (err: any) {
    return {
      name: suite.name,
      passed: false,
      durationMs: Date.now() - start,
      output: err.stdout || err.stderr || String(err),
    };
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function printSummary(results: SuiteResult[]): void {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

  console.log("\n" + "=".repeat(70));
  console.log("  AQUASYNC ENTERPRISE TEST SUITE — FINAL RESULTS");
  console.log("=".repeat(70));
  console.log("");
  console.log("  Suite                          Status     Duration");
  console.log("  " + "-".repeat(50));

  for (const r of results) {
    const status = r.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`  ${r.name.padEnd(30)} ${status.padEnd(10)} ${formatDuration(r.durationMs)}`);
  }

  console.log("  " + "-".repeat(50));
  console.log(`  TOTAL                          ${passed}/${total} passed   ${formatDuration(totalDuration)}`);
  console.log("");

  if (failed > 0) {
    console.log("  FAILURE DETAILS:");
    console.log("");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  ❌ ${r.name}`);
      // Extract failure messages from output
      const lines = r.output.split("\n").filter((l) => l.includes("❌") || l.includes("Error:"));
      for (const line of lines.slice(0, 5)) {
        console.log(`     ${line.trim()}`);
      }
      console.log("");
    }
  }

  console.log("=".repeat(70));
  console.log(`  Exit code: ${failed > 0 ? 1 : 0}`);
  console.log("=".repeat(70));
}

async function main() {
  const moduleFilter = process.argv.find((a) => a.startsWith("--module="));
  const moduleName = moduleFilter ? moduleFilter.split("=")[1].toLowerCase() : null;

  let suitesToRun = SUITES;
  if (moduleName) {
    suitesToRun = SUITES.filter((s) => s.name.toLowerCase().includes(moduleName));
    if (suitesToRun.length === 0) {
      console.error(`No suites found matching module "${moduleName}"`);
      console.log(`Available modules: ${SUITES.map((s) => s.name).join(", ")}`);
      process.exit(1);
    }
    console.log(`Running only module: ${moduleName}`);
    console.log(`Matched suites: ${suitesToRun.map((s) => s.name).join(", ")}`);
  }

  const totalEstimated = suitesToRun.reduce((sum, s) => sum + s.estimatedMs, 0);
  console.log(`Running ${suitesToRun.length} test suites (estimated ${formatDuration(totalEstimated)})`);
  console.log("");

  const results: SuiteResult[] = [];
  for (const suite of suitesToRun) {
    process.stdout.write(`  Running ${suite.name}... `);
    const result = runSuite(suite);
    process.stdout.write(result.passed ? "✅\n" : "❌\n");
    results.push(result);
  }

  printSummary(results);
  process.exit(results.some((r) => !r.passed) ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal runner error:", err);
  process.exit(1);
});
