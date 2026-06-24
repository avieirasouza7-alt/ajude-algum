import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function copyOgShareForServer() {
  return {
    name: "copy-og-share-for-server",
    closeBundle() {
      const src = path.resolve("src/assets/og-share.jpg");
      for (const destDir of [
        path.resolve("dist/server/assets"),
        path.resolve(".output/server/assets"),
      ]) {
        mkdirSync(destDir, { recursive: true });
        copyFileSync(src, path.join(destDir, "og-share.jpg"));
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    ...(command === "build"
      ? [cloudflare({ viteEnvironment: { name: "ssr" } })]
      : []),
    tanstackStart({
      router: {
        routeTreeFileHeader: [],
      },
      server: { entry: "server" },
    }),
    ...(command === "build" ? [copyOgShareForServer()] : []),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
}));
