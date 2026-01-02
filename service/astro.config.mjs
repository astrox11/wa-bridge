import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [tailwind()],
  server: {
    port: 4321,
    host: "127.0.0.1", // Only listen on localhost (internal)
  },
  vite: {
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
        "/health": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
        "/ws": {
          target: "ws://localhost:8000",
          ws: true,
          changeOrigin: true,
        },
      },
    },
  },
});
