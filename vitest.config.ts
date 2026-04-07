import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: ["packages/**/*.test.ts", "apps/api/**/*.test.ts"]
        }
      },
      {
        test: {
          name: "web",
          environment: "jsdom",
          include: ["apps/web/**/*.test.tsx"],
          setupFiles: ["apps/web/src/setupTests.ts"]
        }
      }
    ]
  }
});
