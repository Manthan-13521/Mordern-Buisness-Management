import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const [{ default: mongoose }, { dbConnect }, { Pool }, { Member }, { Plan }] = await Promise.all([
    import("mongoose"),
    import("../../lib/mongodb"),
    import("../../models/Pool"),
    import("../../models/Member"),
    import("../../models/Plan"),
  ]);

  await dbConnect();

  const runner = {
    passed: 0, failed: 0, failures: [] as string[],
    async run(suite: string, tests: { name: string; fn: () => Promise<void> }[]) {
      console.log(`\n============================================================\n  ${suite}\n============================================================`);
      for (const t of tests) {
        try { const start = Date.now(); await t.fn(); console.log(`  \u2705 ${t.name} (${Date.now() - start}ms)`); this.passed++; }
        catch (e: any) { console.log(`  \u274c ${t.name} — ${e.message}`); this.failed++; this.failures.push(`  \u274c ${suite} > ${t.name}\n     ${e.message}`); }
      }
    },
    summary() {
      console.log(`\n============================================================\n  Results: ${this.passed}/${this.passed + this.failed} passed (${this.failed} failed)\n============================================================`);
      if (this.failures.length) { console.log(`\n  Failures:`); this.failures.forEach(f => console.log(f)); }
      return { passed: this.passed, failed: this.failed };
    },
  };

  await runner.run("Database Schema & Validation Tests", [
    { name: "MongoDB connection is active", fn: async () => {
      if (mongoose.connection.readyState !== 1) throw new Error(`Not connected: ${mongoose.connection.readyState}`);
    }},
    { name: "Pool collection exists with schema", fn: async () => {
      const collections = await mongoose.connection.db!.listCollections().toArray();
      const names = collections.map(c => c.name);
      if (!names.includes("pools")) throw new Error("pools collection missing");
    }},
    { name: "Seed data: Pool exists", fn: async () => {
      const pool = await Pool.findOne({ slug: "test-pool" });
      if (!pool) throw new Error("No pool with slug test-pool found — run seed");
    }},
    { name: "Seed data: Members collection queryable", fn: async () => {
      const count = await Member.countDocuments();
      console.log(`  [INFO] Member documents: ${count}`);
    }},
    { name: "Seed data: Plans exist", fn: async () => {
      const count = await Plan.countDocuments();
      if (count === 0) throw new Error("No plans found — run seed");
      console.log(`  [INFO] Plan documents: ${count}`);
    }},
    { name: "Member schema required fields enforced", fn: async () => {
      try {
        const m = new Member({});
        await m.validate();
        throw new Error("Validation should have failed on empty member");
      } catch (err: any) {
        if (!err.errors || !err.errors.name) {
          throw new Error(`Expected name validation error, got: ${err.message}`);
        }
      }
    }},
    { name: "Plan schema required fields enforced", fn: async () => {
      try {
        const p = new Plan({});
        await p.validate();
        throw new Error("Validation should have failed on empty plan");
      } catch (err: any) {
        const fields = Object.keys(err.errors || {});
        if (!fields.includes("name") && !fields.includes("price") && !fields.includes("durationDays")) {
          throw new Error(`Expected name/price/durationDays validation error(s), got: ${fields.join(", ")}`);
        }
      }
    }},
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
