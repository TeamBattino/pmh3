import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./"),
          },
        },
        test: {
          name: "site/unit",
          environment: "node",
          globals: true,
          include: ["testing/unit/**/*.test.{ts,tsx}"],
          exclude: ["**/node_modules/**"],
        },
      },
    ],
  },
});
