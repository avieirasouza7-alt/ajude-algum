import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

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

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const vitePublicEnv = {
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL ?? "",
    VITE_SUPABASE_PUBLISHABLE_KEY: env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
    VITE_SITE_URL: env.VITE_SITE_URL ?? "",
  };

  return {
    plugins: [
      ...(command === "build" ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : []),
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
    optimizeDeps: {
      /* Pré-otimiza os pacotes 3D do Jardim da Esperança para o Vite não
         recarregar a página no primeiro clique em "Jogar agora" (dev). */
      include: ["three", "@react-three/fiber", "@react-three/drei", "@react-three/postprocessing"],
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    define: Object.fromEntries(
      Object.entries(vitePublicEnv).map(([key, value]) => [
        `import.meta.env.${key}`,
        JSON.stringify(value),
      ]),
    ),
  };
});
