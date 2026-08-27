import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
