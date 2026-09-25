import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icon.svg", "favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Heo Nhỏ — Tài chính cá nhân",
        short_name: "Heo Nhỏ",
        lang: "vi",
        description: "Một chút ghi chép, nhẹ lòng mỗi ngày.",
        theme_color: "#171b19",
        background_color: "#111513",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icon-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          { name: "Thêm chi tiêu", url: "/?add=expense" },
          { name: "Thêm thu nhập", url: "/?add=income" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 3000000,
      },
    }),
  ],
  server: { proxy: { "/api": "http://localhost:3000" } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/dexie")) return "storage";
          if (id.includes("node_modules/zod")) return "validation";
          if (
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react/") ||
            id.includes("node_modules/scheduler")
          )
            return "react";
        },
      },
    },
  },
});
