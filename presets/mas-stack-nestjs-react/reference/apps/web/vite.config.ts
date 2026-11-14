import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type ProxyOptions } from "vite";

const apiTarget = process.env["API_PROXY_TARGET"] ?? "http://127.0.0.1:3001";
const apiProxy: Record<string, ProxyOptions> = {
  "/api": {
    target: apiTarget,
    changeOrigin: false,
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@demo/ui": new URL("../../packages/ui/src", import.meta.url).pathname,
    },
  },
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
});
