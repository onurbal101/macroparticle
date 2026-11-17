import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

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
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "icons/*.png",
        "print/*.pdf",
        "print/*.svg",
        "print/manifest.json",
      ],
      manifest: {
        name: "Mikrodalga Rehberi · MS23K3555ES",
        short_name: "Mikrodalga",
        description: "Samsung MS23K3555ES/ND için çevrimdışı kullanım rehberi.",
        lang: "tr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#345247",
        background_color: "#f7f8f4",
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
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,pdf,json}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
  test: { include: ["tests/*.test.ts"] },
} as Parameters<typeof defineConfig>[0]);
