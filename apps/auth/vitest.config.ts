import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./src"),
          },
        },
        test: {
          name: "auth/unit",
          environment: "node",
          globals: true,
          include: ["testing/unit/**/*.test.ts"],
          exclude: ["**/node_modules/**"],
        },
      },
      {
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./src"),
          },
        },
        test: {
          name: "auth/integration",
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
