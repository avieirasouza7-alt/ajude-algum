import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function copyOgShareForServer() {
  return {
    name: "copy-og-share-for-server",
    closeBundle() {
      const src = path.resolve("src/assets/og-share.jpg");
      const destDir = path.resolve("dist/server/assets");
      mkdirSync(destDir, { recursive: true });
      copyFileSync(src, path.join(destDir, "og-share.jpg"));
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    tanstackStart({
      router: {
        routeTreeFileHeader: [],
      },
      server: { entry: "server" },
    }),
    // Netlify plugin uses production asset paths and breaks local dev (CSS/images 404).
    ...(command === "build" ? [netlify(), copyOgShareForServer()] : []),
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
