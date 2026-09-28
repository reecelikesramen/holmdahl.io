---
title: "pywire"
description: "An open-source, HTML-over-the-wire Python web framework. Live at [pywire.dev](https://pywire.dev)"
cover:
  image: ./cover.png
  alt: A todos.wire component in an editor beside the running pywire todo app
  caption: A pywire todo app, with Python state and handlers above the HTML template
showToc: false
weight: 0
---

pywire is a Python web framework for building interactive web apps without writing client-side JavaScript. You write single-file `.wire` components, with Python on top and HTML below. The server renders the page, and when state changes it streams DOM patches to the browser over a WebSocket.

```
---
count = wire(0)
---
<button @click={count += 1}>Clicked {count} times</button>
```

Wrapping a value in `wire()` makes it reactive: any part of the template that reads it re-renders when it changes. There are no JSON APIs to design, no client state to keep in sync, and no client-side router.

**What I built:**

- **The framework:** a Starlette-based runtime, a compiler that turns `.wire` files into Python, reactivity primitives (`wire`, derived values, effects), file-based routing, SPA-style navigation that keeps state across pages and hot reloads, and dev-server error pages that point at the exact line of the `.wire` file.
- **The language tooling:** a tree-sitter grammar that is the single source of truth for the syntax, a Rust-backed parser built on it, a language server (completions, diagnostics, hover, go-to-definition), a VS Code extension, and a Prettier plugin.
- **The ecosystem:** `pywire-auth` (OAuth2/OIDC providers, a local identity provider, policies), a scaffolding CLI (`uvx create-pywire-app` or `npx create-pywire-app`), and a documentation site with an interactive tutorial.
- **The release pipeline:** a monorepo with Conventional Commits and release-please, publishing versioned packages to PyPI, npm, and the VS Code Marketplace, including multi-platform wheels.

**Technologies Used:**

- [Python](https://www.python.org/)
- [Starlette](https://www.starlette.io/)
- [tree-sitter](https://tree-sitter.github.io/)
- [Rust](https://www.rust-lang.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)

---

Try it with `uvx create-pywire-app`, read the docs at [pywire.dev](https://pywire.dev), or browse the source at [github.com/pywire](https://github.com/pywire/pywire).
