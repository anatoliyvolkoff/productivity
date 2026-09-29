import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside Next's server bundle; tests run in plain Node.
      "server-only": path.resolve(import.meta.dirname, "src/test/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: { TZ: "UTC", LOCAL_DB_DIR: "memory://", DATABASE_URL: "" },
    testTimeout: 30_000,
  },
});
