import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://ornis.falconsafe.com.my",
  adapter: cloudflare(),
  security: {
    checkOrigin: false,
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
