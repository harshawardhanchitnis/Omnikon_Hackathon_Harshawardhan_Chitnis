import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "icons/icon-192.svg", "icons/icon-512.svg"],
      manifest: {
        name: "ChalkBox — AI Lesson Planner",
        short_name: "ChalkBox",
        description: "Low-resource, curriculum-aligned lesson planning for teachers.",
        theme_color: "#1f6b5c",
        background_color: "#f7f8f2",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" }
        ]
      },
      workbox: {
        mode: "development",
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,woff,woff2}"]
      }
    })
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  },
  build: {
    target: "es2022",
    sourcemap: true,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js", "@tanstack/react-query"],
          charts: ["recharts"],
          pdf: ["@react-pdf/renderer"]
        }
      }
    }
  }
});
