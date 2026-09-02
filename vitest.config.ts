import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": `${import.meta.dirname}/src`, "server-only": `${import.meta.dirname}/test/server-only.ts` } },
  test: {
    globals: true,
    environment: "node",
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
