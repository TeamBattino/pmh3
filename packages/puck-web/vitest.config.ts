import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // React plugin is included so `.tsx` files with JSX can be imported
  // (e.g. pure data-transform helpers that happen to live next to
  // component code).
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["testing/**/*.test.node.{tsx,ts}"],
    exclude: ["**/node_modules/**"],
  },
});
