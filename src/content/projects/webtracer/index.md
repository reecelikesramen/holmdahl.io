---
title: "WebTracer"
description: "Rust-based ray tracing engine designed for WebAssembly compatibility, featuring a React-powered user interface."
cover:
  image: ./cover.png
  alt: Scene editor, live preview, scenes list, and asset manager
  caption: Scene editor, live preview, scenes list, and asset manager
showToc: false
weight: 2
---

WebTracer is a high-performance ray tracing engine implemented in Rust with WebAssembly compatibility, featuring a modern React-based user interface for real-time scene manipulation. The engine combines the ReSTIR algorithm with GPU acceleration through wgpu, delivering physically accurate lighting simulations directly in the browser.

**Technologies Used:**

- [Rust](https://www.rust-lang.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [WebAssembly](https://webassembly.org/)
- [wgpu](https://wgpu.rs/)
- [Rayon](https://docs.rs/rayon/1.7.0/rayon/)
- [React](https://react.dev/)
- [Vite](https://vite.dev/)

---

**Full project documentation coming soon!**

See the latest of the repo [here](https://github.com/reecelikesramen/rust-raytracer/tree/web-test).

<!-- Key things to highlight when writing:

- Strong grasp of Rust, a low-level and powerful language
- Implemented complicated mathematical algorithms and optimized them with concurrency using Rayon
- Demonstrated realistic raytracing and physically based rendering
- Incorporated importance sampling, using the ReSTIR technique, significantly speeding up rendering without losing quality
- Incorporated GPU-acceleration with WebGPU
- All dependencies and the project compile to WebAssembly
- Implemented a React interface that allows users to interact with the engine from the browser using a JSON code editor, a live renderer, and asset management. -->
