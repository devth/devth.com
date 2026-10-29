import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // Software WebGL and screenshot capture contend for CPU on shared CI runners.
  workers: process.env.CI ? 1 : 3,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    { name: "mobile", testIgnore: "counter.spec.js", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : [
        {
          command: "npx wrangler dev --config wrangler.counter.jsonc --ip 127.0.0.1 --port 4174",
          url: "http://127.0.0.1:4174/counter.svg?page=%2F",
          reuseExistingServer: false,
        },
        {
          command: "npx wrangler dev --ip 127.0.0.1 --port 4173",
          env: { COUNTER_ORIGIN: "http://127.0.0.1:4174" },
          url: "http://127.0.0.1:4173",
          reuseExistingServer: false,
        },
      ],
});
