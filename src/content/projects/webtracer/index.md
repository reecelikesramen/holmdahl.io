---
title: "WebTracer"
description: "A physically based ray tracer written from scratch in Rust, compiled to WebAssembly, with a React scene editor."
cover:
  image: ./cover.png
  alt: Scene editor, live preview, scenes list, and asset manager
  caption: Scene editor, live preview, scenes list, and asset manager
showToc: false
weight: 2
---

WebTracer is a physically based ray tracer I wrote from scratch in Rust and compiled to WebAssembly, so it runs entirely in the browser. A React front end wraps the engine with a JSON scene editor, a live render preview, and an asset manager. I built it between October 2024 and January 2025.

**What went into it:**

- **Rendering:** physically based materials and lighting, with ReSTIR importance sampling to converge on a clean image in far fewer samples.
- **Performance:** the CPU path is parallelized with Rayon and written to be cache-friendly and SIMD-friendly; GPU acceleration runs through wgpu (WebGPU).
- **Portability:** the engine and every dependency compile to WebAssembly, so the same Rust code runs natively and on the web.

**Technologies Used:**

- [Rust](https://www.rust-lang.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [WebAssembly](https://webassembly.org/)
- [wgpu](https://wgpu.rs/)
- [Rayon](https://docs.rs/rayon/)
- [React](https://react.dev/)
- [Vite](https://vite.dev/)

---

The source is on [GitHub](https://github.com/reecelikesramen/rust-raytracer/tree/web-test).
