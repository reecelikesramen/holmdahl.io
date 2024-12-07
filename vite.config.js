import fs from "node:fs/promises"
import { globSync } from "glob"
import { defineConfig } from "vite"
import wasm from "vite-plugin-wasm"
import topLevelAwait from "vite-plugin-top-level-await"
import { resolve } from "node:path"

const movePublicPlugin = {
  name: "move-public",
  closeBundle: async () => {
    await fs.cp(resolve("dist/public"), resolve("dist"), { recursive: true })
    await fs.rm(resolve("dist/public"), { recursive: true })
  },
}

export default defineConfig({
  plugins: [wasm(), topLevelAwait(), movePublicPlugin],
  build: {
    rollupOptions: {
      input: globSync("public/**/*.html"),
    },
  },
})
