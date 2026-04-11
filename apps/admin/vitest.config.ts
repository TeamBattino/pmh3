import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // Unit tests: pure Node, no external services.
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./"),
          },
        },
        test: {
          name: "admin/unit",
          environment: "node",
          globals: true,
          include: ["testing/unit/**/*.test.{ts,tsx}"],
          exclude: ["**/node_modules/**"],
        },
      },
      {
        // Integration tests: spin up MongoDB via testcontainers.
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./"),
          },
        },
        test: {
          name: "admin/integration",
          environment: "node",
          globals: true,
          include: ["testing/integration/**/*.test.ts"],
          exclude: ["**/node_modules/**"],
          testTimeout: 60_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
