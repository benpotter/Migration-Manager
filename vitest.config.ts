import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import path from "path";

// Load test env vars (local Supabase) before tests run
config({ path: ".env.test.local" });

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
    environment: "node",
    globals: false,
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
