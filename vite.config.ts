import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "placeholder.svg", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "OmniStream — Stream From Anywhere",
        short_name: "OmniStream",
        description: "Stream videos from Google Drive, TeraBox, and more. One platform, every cloud.",
        theme_color: "#0d9488",
        background_color: "#0a0d14",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        categories: ["entertainment", "utilities"],
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        screenshots: [],
        share_target: {
          action: "/share-target",
          method: "GET",
          params: {
            title: "title",
            text: "text",
            url: "url",
          },
        },
        shortcuts: [
          {
            name: "Tools",
            url: "/tools",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Saved Files",
            url: "/saved",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Favorites",
            url: "/favorites",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ["**/*.{js,css,html}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB max per file
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 5, maxAgeSeconds: 30 * 24 * 60 * 60 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "gstatic-fonts-cache", expiration: { maxEntries: 5, maxAgeSeconds: 30 * 24 * 60 * 60 } },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["appwrite", "json-bigint", "bignumber.js"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      include: [/json-bigint/, /bignumber\.js/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
}));
