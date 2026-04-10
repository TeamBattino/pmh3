import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: [
    "../packages/puck-web/ui/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../apps/admin/components/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: ["@storybook/addon-themes"],
  framework: "@storybook/nextjs-vite",
  features: {
    experimentalRSC: true,
  },
  staticDirs: ["../packages/puck-web/assets"],
};
export default config;
