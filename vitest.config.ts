import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts", "server/**/*.test.mjs"],
    environment: "node",
    setupFiles: ["src/tests/setup.ts"],
  },
});
