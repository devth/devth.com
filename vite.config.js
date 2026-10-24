import { defineConfig } from "vite-plus";
import { resolve } from "node:path";
import { generateSite } from "./scripts/site.js";

export default defineConfig(async () => {
  const site = await generateSite();
  return {
    fmt: { ignorePatterns: ["posts/**", "drafts/**", "non-posts/**", "content/**"] },
    root: ".site",
    publicDir: "../public",
    build: { outDir: "../dist", emptyOutDir: true, rolldownOptions: { input: site.input } },
    plugins: [
      {
        name: "static-writing",
        generateBundle() {
          for (const [fileName, source] of Object.entries(site.assets)) {
            this.emitFile({ type: "asset", fileName, source });
          }
        },
        configureServer(server) {
          const sources = ["posts", "content", "non-posts", "src"].map((path) => resolve(path));
          server.watcher.add(sources);
          let timer;
          server.watcher.on("all", (_event, path) => {
            if (!sources.some((source) => path.startsWith(source + "/"))) return;
            clearTimeout(timer);
            timer = setTimeout(async () => {
              try {
                await generateSite();
                server.ws.send({ type: "full-reload" });
              } catch (error) {
                server.config.logger.error(error.stack);
              }
            }, 100);
          });
          server.httpServer?.on("close", () => clearTimeout(timer));
        },
      },
    ],
  };
});
