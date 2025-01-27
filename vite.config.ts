import * as fs from "fs/promises";
import { globSync } from "glob";
import { defineConfig, Rollup } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { resolve } from "node:path";
import preact from "@preact/preset-vite";

const movePublicPlugin = {
  name: "move-public",
  // copy dist/public/ to dist/.tmp/
  // remove dist/public/
  // copy dist/.tmp/* to dist/
  // remove dist/.tmp/
  closeBundle: async () => {
    await fs.cp(resolve("dist/public"), resolve("dist/.tmp"), {
      recursive: true,
    });
    await fs.rm(resolve("dist/public"), { recursive: true });
    await fs.cp(resolve("dist/.tmp"), resolve("dist"), { recursive: true });
    await fs.rm(resolve("dist/.tmp"), { recursive: true });
  },
};

const rollupOutput: Rollup.OutputOptions = {
  entryFileNames: "js/[name].min.[hash].js",
  chunkFileNames: "js/[name].min.[hash].js",
  assetFileNames: (assetInfo) => {
    if (assetInfo.names?.some((name) => /^.+\.(js|wasm)$/.test(name))) {
      return "js/[name].min.[hash][extname]";
    }

    // find the first file extension, otherwise its just assets
    const extname = assetInfo.names?.[0]?.split(".")?.pop() ?? "assets";
    return extname + "/[name].min.[hash][extname]";
  },
};

export default defineConfig({
  plugins: [wasm(), topLevelAwait(), preact(), movePublicPlugin],
  build: {
    rollupOptions: {
      input: globSync("public/**/*.html"),
      output: rollupOutput,
    },
  },
  worker: {
    format: "es",
    rollupOptions: {
      output: rollupOutput,
    },
  },
  resolve: {
    alias: {
      json5: "json5/lib/index.js",
    },
  },
});
