import command from "eslint-plugin-command/config";

const eslintConfig = [command(), {
  ignores: ["node_modules/**", "dist/**"]
}];

export default eslintConfig;
