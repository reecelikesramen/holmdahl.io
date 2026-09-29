import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// Builds the WebTracer demo into the site's public/ folder, which Astro serves as-is
// at /projects/webtracer/demo. Output is committed so the site build needs no Rust or Vite step.
export default defineConfig({
  base: "/projects/webtracer/demo/",
  plugins: [preact()],
  build: {
    outDir: "../public/projects/webtracer/demo",
    emptyOutDir: false,
    assetsDir: "app",
  },
  worker: { format: "es" },
  resolve: { alias: { json5: "json5/lib/index.js" } },
});
