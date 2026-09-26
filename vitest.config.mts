import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Streak and weekly tests are about local calendar days, so run them in a
// fixed zone that observes DST (inherited by the test workers).
process.env.TZ = "America/New_York";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
