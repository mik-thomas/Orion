import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function resolveBuildId(): string {
  const fromEnv = process.env.VITE_APP_BUILD?.trim();
  if (fromEnv) return fromEnv;
  const fromRailway = process.env.RAILWAY_GIT_COMMIT_SHA?.trim();
  if (fromRailway) return fromRailway;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "dev";
  }
}

process.env.VITE_APP_BUILD = resolveBuildId();

export default defineConfig({
  plugins: [react()],
  cacheDir: ".cache/vite",
  build: {
    cssMinify: false,
  },
  css: {
    lightningcss: {
      errorRecovery: true,
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        timeout: 120_000,
      },
      "/health": { target: "http://127.0.0.1:3001", changeOrigin: true },
    },
  },
});
