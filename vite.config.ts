import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { staticPages } from "./scripts/pages.ts";

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "validation", test: /node_modules\/zod/ },
            {
              name: "react",
              test: /node_modules\/(react|react-dom|scheduler)\//,
            },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    staticPages(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "icons/*.png",
        "favicon.svg",
        "favicon.ico",
        "print/*.pdf",
        "print/*.svg",
        "print/manifest.json",
      ],
      manifest: {
        id: "/",
        name: "Mikrodalga Rehberi · MS23K3555ES",
        short_name: "Mikrodalga",
        description: "Samsung MS23K3555ES/ND için çevrimdışı kullanım rehberi.",
        lang: "tr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#f2f2f7",
        background_color: "#f2f2f7",
        categories: ["food", "utilities", "education"],
        shortcuts: [
          { name: "Programlar", url: "/programs", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Simülasyon", url: "/simulation", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Rehber", url: "/guide", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        ],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,woff2,png,svg,pdf,json,ico}", "app.html"],
        globIgnores: ["social/**"],
        navigateFallback: "/app.html",
        navigateFallbackDenylist: [/^\/(?:assets|icons|social|content|print)\//, /\.(?:txt|xml|json|svg|png|ico|webmanifest)$/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
  test: { include: ["tests/*.test.ts"] },
} as Parameters<typeof defineConfig>[0]);
