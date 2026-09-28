---
title: "pywire"
description: "An open-source Python web framework for interactive, server-rendered apps, with its own compiler, language server, and editor tooling. Live at [pywire.dev](https://pywire.dev)"
cover:
  image: ./cover.png
  alt: A todos.wire component in an editor beside the running pywire todo app
  caption: A pywire todo app, with Python state and handlers above the HTML template
showToc: true
weight: 0
---

pywire is a Python web framework for building interactive web apps without writing client-side JavaScript. You write single-file `.wire` components, with Python on top and HTML below. The server renders the page, and when state changes it sends the browser patches for just the parts of the page that changed.

I started it in January 2026. It's now about 600 commits across a dozen packages: the framework, a compiler, a language server, a VS Code extension, a formatter, an auth package, a scaffolder, and a docs site whose tutorial runs entirely in your browser. It's open source (Apache 2.0) and pre-1.0.

Try it with `uvx create-pywire-app`, read the docs at [pywire.dev](https://pywire.dev), or browse the source at [github.com/pywire](https://github.com/pywire/pywire).

**Technologies Used:**

- [Python](https://www.python.org/) and [Starlette](https://www.starlette.io/)
- [tree-sitter](https://tree-sitter.github.io/)
- [TypeScript](https://www.typescriptlang.org/) and [morphdom](https://github.com/patrick-steele-idem/morphdom)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) with [pygls](https://github.com/openlawlibrary/pygls) and [Ty](https://github.com/astral-sh/ty)
- [Pyodide](https://pyodide.org/)
- [release-please](https://github.com/googleapis/release-please)

---

# The Problem

A Python developer who wants an interactive web page usually ends up building two applications. The back end is Python. The front end is a JavaScript framework with its own state, its own build tooling, and a JSON API in between that someone has to design, version, and keep in sync. For internal tools, dashboards, and CRUD apps, that split is most of the work.

Server-driven UI avoids the split. The server owns the state, the browser sends events, and the server sends back HTML. Phoenix LiveView, Laravel Livewire, and Blazor Server showed how productive that model can be. But the options I'd used had their own problems. htmx gets hard to read as features grow. Blazor starts off perfect, then its performance suffers in real apps, and its model breaks down around ordinary auth and middleware.

Python has a great ecosystem for building server APIs quickly, and nothing equivalent for building a whole interactive app. I wanted the server-first model in Python, with the authoring experience I like most on the front end: Svelte's single-file components, HTML that looks like HTML, and reactivity that just works. I also think server-first will get more popular as networks get faster and edge deployment gets more practical, because it keeps the mental model and the security model simple.

---

# The Plan

A few decisions shaped everything else:

- **One file per component.** A `.wire` file holds the Python and the HTML together, like a Svelte or Astro component. Styles can be scoped to it.
- **Explicit reactivity.** Ordinary Python variables stay ordinary. Only values wrapped in `wire()` are reactive, so there's no magic around which assignments trigger a re-render.
- **Compile, don't interpret.** Each `.wire` file compiles to a normal Python class. That makes the Python block real Python, which means type checkers, debuggers, and tracebacks all work.
- **Tooling from day one.** A new file format is only pleasant with syntax highlighting, completions, and error squiggles. The first commit included a language server and a VS Code extension.
- **The transport shouldn't matter.** A page should behave the same whether it arrives over HTTP or over the WebSocket, including middleware and auth.

---

# How It Works

![A diagram of pywire's update loop. The browser gets server-rendered HTML on first load. The pywire client sends DOM events to the server over a WebSocket as handler IDs plus form fields, encoded with msgpack. On the server, a page instance compiled from the .wire file runs the handler, which marks every region that reads the changed wire as dirty. The server re-renders only the dirty regions and sends their HTML back, and the client patches just those regions with morphdom.](./how-it-works.png)

The first request is plain HTTP, so every page is real HTML before any script runs. After that, the client opens one WebSocket. Clicking a button sends the handler's ID and any form fields. The server runs the handler on that connection's page instance, works out which template regions read the wires that changed, re-renders just those regions, and sends their HTML back. The client patches them into the DOM with morphdom.

---

# Implementation

## The .wire Format

Here's the todo app from the cover:

```wire
---
todos = wire([
    {"text": "Rebuild the parser in Rust", "done": True},
    {"text": "Ship the language server", "done": True},
    {"text": "Write the tutorial", "done": False},
])
draft = wire("")

@derived
def remaining():
    return sum(not t["done"] for t in todos)

def add():
    todos.value = [*todos, {"text": draft.value, "done": False}]
    draft.value = ""

def toggle(i):
    todos.value = [
        {**t, "done": not t["done"]} if j == i else t
        for j, t in enumerate(todos)
    ]
---
<h1>Todos <small>{remaining} left</small></h1>
<form @submit.prevent={add}>
    <input value={draft} @input={draft.value = event.value}>
</form>
<ul>
    <li $for={i, t in enumerate(todos)} @click={toggle(i)}
        class={{"done": t["done"]}}>{t["text"]}</li>
</ul>
```

Everything above the second `---` is Python. Below it, `{...}` interpolates any Python expression, `@click` and `@submit.prevent` bind events to Python handlers, and `$for` repeats an element. Directives above the Python block, like `!path "/todos"` or `!layout "..."`, set routing and layout. Pages live in `src/pages/`, and the file path becomes the URL unless a `!path` overrides it.

Components are just `.wire` files you import with normal Python imports. Their props are a typed class:

```wire
---
from pywire import props

@props
class Props:
    name: str
    greeting: str = "Hello"
---
<h2>{props.greeting}, {props.name}!</h2>
```

Markup passed between a component's tags arrives as `children`, and a component renders it with `{$render children}`. Named snippets fill other regions, which is also how layouts work.

## The Compiler

The parser went through three versions, each replacing the one before when it hit a limit:

1. A hand-written HTML parser, which lasted a day.
2. **lxml**, which was fine until the syntax grew. A `.wire` file mixes Python, HTML, CSS, and JavaScript, with Python expressions inside attributes and text, and every tool needs to agree on where one language ends and the next begins.
3. **A tree-sitter grammar**, which became the single source of truth for the language. The compiler, the language server, the syntax highlighter, and the formatter all read the same grammar, so they can't disagree.

The tree-sitter parser was first built in Rust. It was fast, but it had to be compiled for every platform and again for WebAssembly, and on the day it landed CI needed more than a dozen fixes. In hindsight it was premature optimization. Two months later I replaced it with a pure-Python package built on the same grammar, "so the grammar loads without platform-specific Rust wheels." That's what lets pywire run in Pyodide and on Cloudflare's Python Workers.

The compiler turns each `.wire` file into a Python class, with a source map back to the original file. When something fails, the traceback points at the right line of your `.wire` file, and in development, `print()` output and errors from event handlers appear in your browser's console.

## Reactivity

Reactivity went through five designs before settling:

1. Plain top-level variables, which the compiler moved onto the page object.
2. An explicit `wire()` primitive, added "to be explicitly reactive and properly handle state and scoping issues," with a `$count` shorthand.
3. `wire`, `derived`, and `effect`, without the shorthand, which made the grammar ambiguous.
4. Svelte-style stores on top of that.
5. Stores removed again, because they "feel foreign next to `wire`/`derived`." What's left is `wire`, `derived`, and `producer`.

Wires unwrap automatically in templates, comparisons, iteration, and `len()`, so you only write `.value` when you reassign one. Writing to a wire marks every template region that reads it as dirty, and only dirty regions are re-rendered and sent.

The project's contributor guide says it plainly: "The project has few users. Prefer clean breaks over compatibility." Pre-1.0 is the cheapest time to fix an API.

## One Rule for Both Transports

pywire pages load over HTTP, but moving between pages happens over the WebSocket, like a single-page app. For a while that had a serious gap: "SPA navigation via WebSocket bypassed the entire ASGI middleware stack. Auth, rate limiting, CORS — all skipped when the user clicked a link."

The fix runs every WebSocket navigation through the middleware stack as an internal request, and it became a design rule: middleware, auth, and sessions "must behave identically for HTTP loads and WebSocket SPA navigations." `pywire-auth` follows it. It provides OAuth2/OIDC sign-in with Google, GitHub, Microsoft, and others, plus a local identity provider, and its policies work the same on both paths and fail closed.

The same thinking goes into deployment:

- **Several workers:** a Redis session store lets pywire run across workers. It used to require a single worker because session state lived in memory.
- **No WebSockets:** an HTTP-only mode serves apps where persistent WebSockets aren't possible.
- **Existing apps:** pywire can be mounted inside a FastAPI or Starlette app.
- **Hosting:** the scaffolder can generate deploy configs for Docker, Render, Fly, Railway, and Cloudflare.

## Editor Tooling

The tooling is half the project:

- **Language server:** it transpiles `.wire` files to Python with a source map and runs [Ty](https://github.com/astral-sh/ty) on the result. That gives completions, hover, go-to-definition, and type errors inside `.wire` files. It started on jedi, then moved to Pyright, then to Ty for speed.
- **VS Code extension:** highlighting comes from pywire's TextMate grammar (this site uses the same grammar for its code blocks). The extension installs the language server into a managed environment, so server updates ship without a new extension release.
- **Prettier plugin:** formats `.wire` files.
- **`pywire check`:** static analysis for mistakes the type checker can't see.

## Learning It in the Browser

The [interactive tutorial](https://pywire.dev/docs/tutorial/) has 34 steps, and each one runs pywire itself in your browser with Pyodide. There's nothing to install. The server and the client both run in the page, with a shim in place of the WebSocket between them. Getting that right took a weekend of fixes for stale connections, orphaned app instances, and heartbeat timers that outlived their iframes, ending with the realization that a WebSocket ping loop is pointless when "both ends are in-browser."

## Shipping It

pywire started as several repositories. In April 2026 I merged them into one monorepo, keeping their history, and set up release-please to version and publish each package on its own:

- Python packages go to PyPI.
- The VS Code extension goes to the Marketplace and Open VSX.
- An `npx create-pywire-app` launcher goes to npm.

The core package has had 31 releases since then.

Packages depend on each other, so a language server release is only safe once the pywire version it needs is published. The repo derives its dependency graph from the package manifests and blocks a release until everything it depends on is out. The test suite has more than a thousand tests and runs on Python 3.11 through 3.14.

---

# Where It Stands

pywire is at version 0.15. The docs say the API "will tighten before v1." Work in progress includes CSRF protection, observability, a test client, more `pywire check` rules, and more ways to deploy.

<!-- TODO(Reece): add adoption or impact numbers if you have them (PyPI downloads, VS Code installs, stars, anyone using it), and a link to the roadmap page that defines 1.0. -->

I'm writing a longer post about building pywire: the parts I rewrote, the parts I deleted, and what I learned building developer tools as one person. If you try it, I'd love to hear what you build.
