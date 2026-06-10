import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

const hmrDisabled = process.env.ASTRO_NO_HMR === "true";

export default defineConfig({
  site: "https://ornis.falconsafe.com.my",
  adapter: cloudflare(),
  devToolbar: {
    enabled: false,
  },
  security: {
    checkOrigin: false,
  },
  integrations: [react()],
  vite: {
    server: hmrDisabled ? { hmr: false, ws: false } : undefined,
    plugins: [tailwindcss()],
  },
});
