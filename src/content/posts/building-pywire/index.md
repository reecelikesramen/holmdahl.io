---
author: Reece Holmdahl
title: Building pywire
description: Nine months of building a Python web framework, its compiler, and its editor tooling, and what I'd tell myself on day one
draft: true
pubDate: 2026-09-27
cover:
  image: ./cover.png
  alt: The pywire counter starter app, showing a count of 42 with Increment and Reset buttons
  caption: The starter app from uvx create-pywire-app
tags: [pywire, python, web-development, compilers, open-source]
showReadingTime: true
showToc: true
tocOpen: false
---

<!--
DRAFT. Facts come from the pywire repo history (github.com/pywire/pywire), its docs, and AGENTS.md.
"Q:" comments are interview questions for Reece; answers get woven into the section they sit in.
Anything in [brackets] is a placeholder for Reece's own words.
-->

On January 11, 2026, I made the first commit to a project called PyHTML. The commit message was "Proof of concept of project, LSP, vscode extension, and demo-app for python interactive server and python-in-html paradigm." Two weeks later it was renamed [pywire](https://pywire.dev), and today it is a Python web framework with a compiler, a language server, a VS Code extension, a formatter, an auth package, a scaffolder, and a docs site whose tutorial runs entirely in your browser.

It's nearly 600 commits, twelve independently versioned packages, and more than a thousand tests later. This post is the story of how it got here: the parts I rewrote three times, the parts I deleted, and what I learned about building developer tools as one person.

# The idea

A pywire page is a `.wire` file: Python in a fence at the top, HTML below.

```
---
count = wire(0)
---
<button @click={count += 1}>Clicked {count} times</button>
```

The server renders the page. When you click the button, the event goes up a WebSocket, the handler runs in Python, and the server sends back a patch for just the part of the DOM that changed. There's no client-side state to keep in sync, no JSON API to design, and no JavaScript to write. The docs sum it up as "HTML-over-the-wire without the JavaScript hangover," or "the frontend ergonomics of Svelte, the simplicity of Python."

<!--
Q: What was the itch on January 11? Specifically:
  - Was Blazor Server's Interactive Server mode (from your .NET work) the model? The AGENTS.md
    explicitly says "no Blazor-style explicit auth scopes / cascading parameters," so you clearly
    know it well and disagree with parts of it.
  - Did you try Phoenix LiveView, Laravel Livewire, htmx, Reflex, NiceGUI, or Streamlit first?
    What was missing for Python?
  - Was there a specific app you wanted to build?
  - Why "PyHTML" -> "pywire"?
-->

[Why I started: 1–2 paragraphs in your words.]

# Tooling on day one

The very first commit had a language server and a VS Code extension in it, before the framework was anywhere near stable. A new file format without syntax highlighting, completions, or error squiggles is miserable to use, and I didn't want to design a language I wouldn't enjoy writing myself.

<!-- Q: Was editor support a deliberate day-one goal, or did it happen to come together fast? -->

The next day added the template attributes (`$if`, `$show`, `$bind`, `$for`), a compile-error page in the dev server, state that survives hot reloads, and one of my favorite small features: a `print()` in a server-side event handler shows up in your browser's console.

The language server itself went through three designs. It started on jedi, moved to generating shadow `.wire.py` files and running Pyright on them, and in February switched to [Ty](https://github.com/astral-sh/ty) with virtual documents, "as much faster LSP." Today the server transpiles `.wire` to Python with a source map, so a type error in your handler points at the right line of your `.wire` file.

<!-- Q: Why bet on Ty while it was still young? How has that bet played out? -->

# The parser, three times

The parser is the clearest example of how pywire actually got built: make it work, find where it breaks, and replace it.

1. **A hand-written HTML parser.** It lasted one day.
2. **lxml.** Good enough until the syntax grew. A `.wire` file mixes Python, HTML, CSS, and JavaScript, plus Python expressions inside attributes and text, and every tool needs to agree on where one language ends and the next begins.
3. **A tree-sitter grammar with a Rust parser.** On February 10 I rebuilt the parser on [tree-sitter](https://tree-sitter.github.io/) and made the grammar "the ground-truth for language." The compiler, language server, syntax highlighting, and Prettier plugin all read the same grammar, so they can't drift apart.

That February rewrite also forced syntax decisions. The Python section moved into an Astro-style `---` fence instead of a `---html---` separator, and a `$count` shorthand for `count.value` was removed "to alleviate grammar inconsistencies."

It came with a price. That same day I pushed more than a dozen `fix(ci)` commits trying to build the Rust parser for Linux wheels *and* for WebAssembly under Pyodide. Two months later I deleted the Rust. The parser became a pure-Python package on top of the same tree-sitter grammar, "so the grammar loads without platform-specific Rust wheels," which is what made pywire run on Pyodide and Cloudflare Python Workers.

<!--
Q: Was the Rust parser a mistake, or a necessary step to get the grammar right? What was the
hardest parsing problem? (The history shows a long-running bug where the compiler hoisted
comprehension and loop variables onto the page object, e.g. a `for i in range(...)` making every
row's `toggle(i)` act on the last row. Worth a paragraph if you remember it.)
-->

**Lesson:** when several tools need to understand the same language, give them one grammar. And the most elegant implementation is worth less than the one that installs everywhere.

# Reactivity, five times

If the parser went through three versions, reactivity went through five:

1. Plain top-level variables, which the compiler quietly moved onto the page instance.
2. An explicit `wire()` primitive (January 30), added "to be explicitly reactive and properly handle state and scoping issues," with a `$count` shorthand.
3. `wire`, `derived`, and `effect`, without the shorthand (February).
4. Svelte-style stores on top of that (April).
5. Stores removed again (May), in the only breaking-change commit on main.

The reason for that last step, from the pull request: the stores API "feels foreign next to `wire`/`derived`," module-level `wire()` already shares state across pages, and an `@effect` is behaviorally identical to subscribing to a store. "So the stores layer was largely redundant." What's left is `wire`, `derived`, and `producer`, and ordinary Python variables behave like ordinary Python variables.

<!-- Q: Do you miss the `$count` shorthand? What convinced you that explicit `.value` was worth it? -->

This is where a line from pywire's contributor guide comes from: "The project has few users. Prefer clean breaks over compatibility." Pre-1.0 is the cheapest time to admit an API was wrong.

# One rule: the transport doesn't matter

pywire pages load over plain HTTP, but navigating between pages happens over the WebSocket, like a single-page app. For a while that had a nasty consequence: "SPA navigation via WebSocket bypassed the entire ASGI middleware stack. Auth, rate limiting, CORS — all skipped when the user clicked a link."

The fix replays each WebSocket navigation through the middleware stack as an internal request. It also became a design rule: middleware, auth, and sessions "must behave identically for HTTP loads and WebSocket SPA navigations. Never make app developers handle the two contexts differently." That rule shaped `pywire-auth` too, with OIDC providers, a local identity provider, and policies that fail closed.

<!-- Q: Is the "no Blazor-style scopes" rule from pain you've felt with Blazor at work? -->

# A tutorial that runs in your browser

The [interactive tutorial](https://pywire.dev/docs/tutorial/) has 34 steps, and every one runs pywire itself in your browser with Pyodide. There's no server to install. The server and the client both live in the page, with a shim standing in for the WebSocket between them.

Getting that right took about a dozen pull requests in one weekend: orphaned app instances after a preview reload, heartbeat timers that outlived their iframes, and eventually the realization that the WebSocket ping loop is pointless when "both ends are in-browser."

<!-- Q: Why invest that much in an in-browser tutorial? Has it changed how people find or try pywire? -->

# Shipping as one person

pywire started as a handful of separate repositories. In April I merged them into one monorepo with their history, and set up [release-please](https://github.com/googleapis/release-please) to version and publish each package on its own: Python packages to PyPI, a VS Code extension to the Marketplace and Open VSX, and, as of this week, `npx create-pywire-app` on npm. There have been 31 releases of the core package since then.

Solo release automation has its own problems. Packages depend on each other, so a release of the language server is only safe once the version of pywire it needs has been published. The repo now derives its dependency graph from the package manifests and gates every release on it. I also learned that "an extra `(`" in a pull-request title makes release-please silently drop the commit.

<!-- Q: Was a 12-package monorepo with this much release tooling worth it as a solo maintainer? -->

# Detours

Not everything made it. From February to March I built pywire-shell, "lightweight desktop apps with Python + HTML/CSS" on the Servo browser engine, with native macOS menus. It was cut in the monorepo move as an out-of-scope experiment.

<!-- Q: What was pywire-shell meant to become, and why cut it? -->

The history also has two quiet stretches: March, and May through most of September.

<!-- Q: What happened in those gaps, and what brought you back in late September? (Optional; a
sentence like "I started a new role as Lead" is honest and relatable.) -->

# Building it with AI agents

<!--
Q: This section could be the most interesting one for readers, and it connects directly to your
day job (you lead AI adoption at CalcAir). What the repo shows:
  - CLAUDE.md and agent skills from April; in September they became AGENTS.md so the same setup
    works in Claude Code, Codex, Cursor, pi, and OpenCode, with pre-commit hooks for each.
  - A scratchpad rule: throwaway code gets reviewed by a *different* model with none of the
    original context before it runs.
  - Design specs written and reviewed before implementation (the "superpowers" docs).
Questions:
  - Which work do you hand to agents, and which do you keep?
  - How did your approach change between April and September?
  - What does cross-model review catch that a single model misses?
  - How much of pywire would exist without agents?
-->

[Your words: how you work with agents on pywire and what you've learned.]

# What I learned

<!-- Q: Pick the 3–4 that are genuinely yours; rewrite in your voice. -->

- **Tooling is the product.** Nobody adopts a language their editor doesn't understand.
- **One grammar, many consumers.** The tree-sitter grammar paid for itself in every tool that reads it.
- **Portability beats elegance.** The Rust parser was faster and harder to ship. The pure-Python one runs everywhere, including in a browser.
- **Break things before 1.0, on purpose.** Stores, slots, the `$` shorthand, and the old context API are all gone, and the framework is better for it.
- **Automate releases early.** It's what lets one person keep shipping twelve packages.

# What's next

The docs say pywire is pre-1.0 and "the API will tighten before v1."

<!--
Q: What does 1.0 mean to you? The unmerged branches point at:
  - a stateless "edge" mode (signed state snapshots, in the spirit of Livewire; keyed list diffs
    like LiveView) for serverless and edge deploys
  - CSRF protection, observability, and a test client
  - more `pywire check` static-analysis rules
Which of these do you want to talk about publicly? Anything you want early users or contributors
to try?
-->

[What's next, in your words.]

If you want to try it, run `uvx create-pywire-app` (or `npx create-pywire-app`), then `uv run pywire dev`. The docs are at [pywire.dev](https://pywire.dev) and the source is at [github.com/pywire](https://github.com/pywire/pywire). I'd love to hear what you build.
