# WebTracer demo

The browser app served at `/projects/webtracer/demo`. It is a small Vite + Preact app that loads the
Rust engine compiled to WebAssembly and renders on a thread pool (wasm-bindgen-rayon).

The built output is committed under `public/projects/webtracer/demo/`, so the Astro build needs no Rust
or Vite step. Sample scenes, models and textures are in `public/projects/webtracer/demo/data/`
(`index.json` lists them). The two largest originals (`bear.obj`, `jupiter_map_css_plus_juno_bj.png`)
were left out because Cloudflare assets cap files at 25 MiB.

Threads need cross-origin isolation, so `public/_headers` sends COOP/COEP and a same-origin CSP for this
route. That means the page cannot load external fonts, scripts or images.

## Rebuild the app

```sh
cd webtracer-demo
pnpm install --ignore-workspace
pnpm run build   # writes ../public/projects/webtracer/demo (app/ and index.html)
```

## Rebuild the engine (`src/pkg`)

From `github.com/reecelikesramen/rust-raytracer`, branch `web-test` (pinned nightly-2024-08-02):

```sh
cd raytracer-wasm
cargo build --target wasm32-unknown-unknown --release   # needs rustup nightly-2024-08-02 + rust-src
wasm-bindgen ../target/wasm32-unknown-unknown/release/raytracer_wasm.wasm --out-dir <here>/src/pkg --target web   # wasm-bindgen-cli 0.2.99
```

Then patch the generated `src/pkg/snippets/*/src/workerHelpers.js` so `import('../../..')` becomes
`import('../../../raytracer_wasm.js')`; Vite cannot resolve the directory import.
