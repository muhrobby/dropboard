import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    setupFiles: ["__tests__/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run test files sequentially — integration tests share a real DB
    fileParallelism: false,
    pool: "forks",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
