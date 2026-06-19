import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  plugins: [
    tanstackStart({
      router: {
        routeTreeFileHeader: [],
      },
      server: { entry: "server" },
    }),
    // Netlify plugin uses production asset paths and breaks local dev (CSS/images 404).
    ...(command === "build" ? [netlify()] : []),
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
