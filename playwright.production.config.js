import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/production",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4175", javaScriptEnabled: false },
  webServer: [
    {
      command: "npx wrangler dev --config wrangler.production.jsonc --ip 127.0.0.1 --port 4175",
      url: "http://127.0.0.1:4175/",
      env: { COUNTER_ORIGIN: "http://127.0.0.1:4175" },
      timeout: 60_000,
    },
    {
      command: "npx wrangler dev --config wrangler.www.jsonc --ip 127.0.0.1 --port 4176",
      // Probe the port so readiness never follows the redirect to live production.
      port: 4176,
      timeout: 60_000,
    },
  ],
});
