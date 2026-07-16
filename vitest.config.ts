import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "tests/performance/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./tests/coverage",
      include: [
        "app/api/**/route.ts",
        "lib/**/*.ts",
        "middlewares/**/*.ts",
        "models/**/*.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/*.config.*",
        "**/node_modules/**",
        "lib/local-db/**",
      ],
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
    setupFiles: ["./tests/helpers/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
