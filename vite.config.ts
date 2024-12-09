import * as fs from "fs/promises"
import { globSync } from "glob"
import { defineConfig } from "vite"
import wasm from "vite-plugin-wasm"
import topLevelAwait from "vite-plugin-top-level-await"
import { resolve } from "node:path"
import preact from "@preact/preset-vite"

const movePublicPlugin = {
  name: "move-public",
  closeBundle: async () => {
    await fs.cp(resolve("dist/public"), resolve("dist"), { recursive: true })
    await fs.rm(resolve("dist/public"), { recursive: true })
  },
}

export default defineConfig({
  plugins: [wasm(), topLevelAwait(), preact(), movePublicPlugin],
  build: {
    rollupOptions: {
      input: globSync("public/**/*.html"),
    },
  },
  base: "https://reece.holmdahl.io",
  resolve: {
    alias: {
      json5: "json5/lib/index.js",
    },
  },
})
