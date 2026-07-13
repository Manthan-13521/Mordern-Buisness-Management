export function formatTestHeader(title: string): string {
  const line = "=".repeat(60);
  return `\n${line}\n  ${title}\n${line}\n`;
}

export function formatSubTest(name: string): string {
  return `  ▶ ${name}`;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export class TestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private currentSuite: string = "";

  suite(name: string): void {
    this.currentSuite = name;
    console.log(formatTestHeader(name));
  }

  async test(name: string, fn: () => Promise<void>): Promise<void> {
    const start = Date.now();
    try {
      await fn();
      const duration = Date.now() - start;
      this.results.push({ name: `${this.currentSuite} > ${name}`, passed: true, durationMs: duration });
      console.log(`  ✅ ${name} (${duration}ms)`);
    } catch (err: any) {
      const duration = Date.now() - start;
      this.results.push({
        name: `${this.currentSuite} > ${name}`,
        passed: false,
        error: err.message || String(err),
        durationMs: duration,
      });
      console.log(`  ❌ ${name} — ${err.message || String(err)} (${duration}ms)`);
    }
  }

  summary(): {
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
    results: TestResult[];
  } {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;
    const durationMs = Date.now() - this.startTime;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`  Results: ${passed}/${total} passed (${failed} failed)`);
    console.log(`  Duration: ${durationMs}ms`);
    console.log(`${"=".repeat(60)}\n`);

    if (failed > 0) {
      console.log("  Failures:");
      for (const r of this.results.filter((r) => !r.passed)) {
        console.log(`    ❌ ${r.name}`);
        console.log(`       ${r.error}`);
      }
    }

    return { total, passed, failed, durationMs, results: this.results };
  }

  async run(suiteName: string, tests: Array<{ name: string; fn: () => Promise<void> }>): Promise<void> {
    this.startTime = Date.now();
    this.suite(suiteName);
    for (const t of tests) {
      await this.test(t.name, t.fn);
    }
  }
}
