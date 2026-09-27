---
author: Reece Holmdahl
title: Building pywire
description: What I learned building a Python web framework, its compiler, and its editor tooling from scratch
draft: true
pubDate: 2026-09-27
tags: [pywire, python, web-development, compilers, open-source]
showReadingTime: true
showToc: true
tocOpen: false
---

<!--
DRAFT. Questions for Reece are marked "Q:". Everything else is based on the pywire repo
history (github.com/pywire/pywire) and docs. Rewrite freely in your own voice.
-->

In January 2026 I made the first commit to [pywire](https://pywire.dev), a Python web framework where you write your whole UI in Python and HTML and never touch client-side JavaScript. Nine months and nearly 600 commits later, it has a compiler, a language server, a VS Code extension, a Prettier plugin, an auth package, a scaffolder, and a docs site with an interactive tutorial that runs entirely in your browser. This post is about why I built it and what I learned along the way.

# Why build another web framework?

<!--
Q: What was the itch? A few angles to pick from (or replace):
  - Did Blazor Server (the "Interactive Server" render mode) from your .NET work inspire it? The
    model is very similar: server-side state, events over a WebSocket, DOM diffs back.
  - Phoenix LiveView / Laravel Livewire / htmx: did you try them, and what was missing for Python?
  - Streamlit/NiceGUI/Reflex: why weren't they enough?
  - Was there a specific app you wanted to build with it?
-->

The idea behind pywire is simple: keep the state on the server, send events up over a WebSocket, and send HTML diffs back down. That gives you the interactivity of a single-page app without writing a separate front end, inventing a JSON API for it, or keeping two copies of your state in sync.

What I wanted on top of that was the authoring experience of Svelte: single-file components, HTML that looks like HTML, and reactivity that just works. So a pywire component looks like this:

```
---
count = wire(0)
---
<button @click={count += 1}>Clicked {count} times</button>
```

Python goes in the fence at the top and HTML goes below. Wrapping a value in `wire()` makes it reactive, and anything in the template that reads it re-renders when it changes.

# Day one: the tooling came first

The very first commit contained a proof-of-concept runtime, a demo app, *and* a language server and VS Code extension. That was deliberate. A new file format with no syntax highlighting, completions, or error squiggles is miserable to use, and I didn't want to design a language I couldn't comfortably write myself.

<!-- Q: True? Was editor support a day-one goal, or did it happen to come together fast? -->

The next day brought the control-flow attributes (`$if`, `$show`, `$bind`, `$for`), state that survives hot reloads, and something I still love: `print()` statements and runtime errors on the server show up in the browser console.

# Rewriting the parser (twice)

The first parser was hand-written, and within a day I had replaced it with lxml. That worked until the syntax grew. A `.wire` file mixes Python, HTML, CSS, and JavaScript, plus expressions inside attributes and text, and every tool (the compiler, the language server, the syntax highlighter, the formatter) needs to agree on where one language ends and the next begins.

In February I rebuilt the parser on a [tree-sitter](https://tree-sitter.github.io/) grammar and made that grammar the single source of truth for the language. The compiler, the language server, the VS Code highlighting, and the Prettier plugin all read the same grammar, so they can't drift apart. The rewrite also forced some syntax decisions: I moved to an Astro-style fenced Python block, and I removed a `$` shorthand that made the grammar ambiguous.

<!--
Q: What was the hardest bug or design problem in the parser rewrite? A concrete story here would
make the section. Also: what made you pick tree-sitter over, say, a PEG parser in Python?
-->

**Lesson:** when several tools need to understand the same language, give them one grammar. Every hour spent on the grammar paid for itself in each tool that consumed it.

# Reactivity

pywire started with plain variables and grew into a small set of primitives: `wire()` for state, derived values, and effects, later unified into `wire`, `derived`, and `producer` in a breaking change I'm glad I made before 1.0.

<!-- Q: What pushed you to unify the stores? What did the old API get wrong? -->

# Shipping it

A framework is also a release problem. pywire is a monorepo of about ten packages across two ecosystems: Python packages on PyPI (the framework, auth, language server, CLI, scaffolder, and parser), an `npx create-pywire-app` launcher on npm, a Prettier plugin, and a VS Code Marketplace extension. Commits follow Conventional Commits, and release-please opens a versioned release PR per package, with multi-platform wheels built in CI and dependency floors checked before anything publishes.

It took real effort to get there. The CI history from February is a long run of commits trying to get a tree-sitter dependency to build for publishing and for the docs site's WebAssembly bundle. But now releasing is a merge, not a chore.

# The docs run pywire in your browser

The [interactive tutorial](https://pywire.dev/docs/tutorial/) runs pywire itself in the browser with Pyodide, with a shim standing in for the WebSocket between the "server" and the page. Getting that shim right took a string of fixes around stale connections, heartbeat timers, and iframes that outlived their pages, but it means you can learn pywire without installing anything.

<!-- Q: Worth a paragraph on why you invested in an in-browser tutorial? -->

# What I learned

<!--
Q: Pick 2-4 that are genuinely yours. Candidates from the history:
  - Tooling is the product: nobody adopts a language their editor doesn't understand.
  - One grammar, many consumers.
  - Make breaking changes before 1.0, on purpose.
  - Automate releases early; it's the thing that lets a solo maintainer keep shipping.
  - How AI coding tools changed what one person can build (the repo has an AGENTS.md; did
    Claude Code or Cursor play a big role? This ties directly to your day job and is worth saying
    if true.)
-->

# What's next

<!-- Q: The docs say the API will tighten before v1. What's on the road to 1.0? Anything you want
contributors or early users to try? -->

If you want to try it, run `uvx create-pywire-app` (or `npx create-pywire-app`), and then `uv run pywire dev`. The docs are at [pywire.dev](https://pywire.dev) and the source is at [github.com/pywire](https://github.com/pywire/pywire). I'd love to hear what you build.
