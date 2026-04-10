import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import command from "eslint-plugin-command/config";

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, command(), {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]
}];

export default eslintConfig;
