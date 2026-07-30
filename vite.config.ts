// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          globDirectory: undefined,
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // Navegações (HTML): sempre tenta a rede primeiro, cai no cache offline
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "gastocerto-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // Assets versionados do build (mesma origem)
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && ["script", "style", "worker"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "gastocerto-assets",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Imagens e fontes locais
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && ["image", "font"].includes(request.destination),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "gastocerto-media",
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
              handler: "CacheFirst",
              options: {
                cacheName: "gastocerto-webfonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
    ],
  },
});
