import { defineConfig } from "vite-plus/test/config";

export default defineConfig({
  test: { include: ["tests/**/*.test.js"] },
});
