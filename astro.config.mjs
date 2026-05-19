import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://ornis-security-safe.local",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
