---
author: Reece Holmdahl
title: Building pywire
description: Nine months of building a Python web framework, its compiler, and its editor tooling, and what I'd tell myself on day one
draft: true
pubDate: 2026-09-27
cover:
  image: ./cover.png
  alt: The pywire logo and the title Building pywire beside a counter.wire file on the server and the running counter in the browser
  caption: A pywire counter, with its state on the server and the page in the browser
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

On January 11, 2026, I made the first commit to a project called PyHTML. The commit message was "Proof of concept of project, LSP, vscode extension, and demo-app for python interactive server and python-in-html paradigm." Two weeks later it was renamed [pywire](https://pywire.dev). The PyHTML name was already taken on PyPI, and so was pywire, but its maintainer kindly gave the name up for me. I think it's the better identity anyway. Today it is a Python web framework with a compiler, a language server, a VS Code extension, a formatter, an auth package, a scaffolder, and a docs site whose tutorial runs entirely in your browser.

It's nearly 600 commits, twelve independently versioned packages, and more than a thousand tests later. This post is the story of how it got here: the parts I rewrote three times, the parts I deleted, and what I learned about building developer tools as one person.

# The idea

A pywire page is a `.wire` file: Python in a fence at the top, HTML below.

```wire
---
count = wire(0)
---
<button @click={count += 1}>Clicked {count} times</button>
```

The server renders the page. When you click the button, the event goes up a WebSocket, the handler runs in Python, and the server sends back a patch for just the part of the DOM that changed. There's no client-side state to keep in sync, no JSON API to design, and no JavaScript to write. The docs sum it up as "HTML-over-the-wire without the JavaScript hangover," or "the frontend ergonomics of Svelte, the simplicity of Python."

# Why I built it

Before pywire, I'd been doing web work across a lot of stacks: React, Svelte, and Vue, Classic ASP (really), and Blazor, plus lighter client-side tools like Alpine.js and htmx. Every one of them had quirks I kept running into.

Front-end frameworks make you write glue. The state lives in the browser, the data lives on the server, and you manage the sync between them. Sharing models across two languages adds steps and churn, and code generation buys speed by giving up flexibility.

Blazor and htmx both felt like the right mental model at first, and both ballooned in complexity, for different reasons. htmx gets hard to read, and it takes real discipline to build large features that lean on the server. Blazor starts off perfect, but its performance suffers in the real world, and its model breaks down as soon as you bring in classic expectations about auth and middleware. Then you're jumping through hoops, with documentation that doesn't help much.

So I started pywire for myself, to fix problems I thought were solvable that no framework was solving well. Python also has a great ecosystem for building server APIs quickly, but nothing equivalent for building a whole interactive app. And I think server-first will get more popular as the internet gets faster and edge deployment gets more practical, because it keeps both the mental model and the security model simple.

# It started in Kotlin

pywire wasn't my first attempt at this idea. In August 2025, five months before the first pywire commit, I built it twice in Kotlin, because Kotlin's developer experience is the best I've used. It performs well and has all of Java's libraries behind it. Its trailing-lambda syntax makes DSLs that are efficient to write and easy to read, and coroutines make async code pleasant. I wanted all of that for the web.

The first prototype took four days, and it was purely server-served. Its design doc opened big, with Rails-style conventions and MVVM and MVI patterns layered on top. Within days I'd cut it down to something very close to pywire: components written as Kotlin functions on [Ktor](https://ktor.io/), HTML from a type-safe DSL, and state that lives in the user's server session. A small TypeScript runtime in the browser forwarded clicks, inputs, and form submissions over a WebSocket, with HTTP as a fallback, and the server re-rendered the component and sent back its HTML. By the fourth day, a todo app worked.

A counter looked like this, with `count` living in the session on the server:

```kotlin
fun counterComponent(start: Int = 0) = component {
    var count by state(start)

    div {
        div { +"$count" }
        button {
            onClick { count++ }
            +"Increment"
        }
    }
}
```

The second, [Kascade](https://github.com/reecelikesramen/kascade), went a different direction. It was more React-inspired and built on Kotlin Multiplatform, so the same component code compiled for the JVM server and for the browser. The goal was a Kotlin-only DSL where you could put an action on the front end or the back end seamlessly, with effortless RPC between them, all in one model. The same counter looked like this:

```kotlin
val CounterComponent = component<CounterComponentProps> {
    var count by state(props.start)

    body {
        div { +"$count" }
        button {
            onClick { count += props.step }
            +"Increment"
        }
    }
}
```

In six days Kascade got layouts, client-side routing, typed route parameters, and nested components. It also got a DOM patching step that I switched from snabbdom to morphdom because it was "more practical, less issues." pywire still patches the page with morphdom today.

Kascade stalled for two reasons. Kotlin Multiplatform was still immature, and a codebase where *all* code targets both the server and the client, with no finer control over what runs where, gets complicated fast. And Kotlin's reach is limited. A Kotlin web framework would be a hard sell to anyone but Kotlin diehards. Python is far more popular for building APIs and more relevant for AI-native coding, and it's nice to write, with a massive library ecosystem. Building apps in Python should be nicer than it is.

So pywire went back to the first prototype's model, where everything runs on the server. It's a bet that the network is getting fast enough for that. Round trips to edge deployments keep shrinking, and WebTransport is coming.

Kotlin also taught me what I *didn't* want. HTML written as Kotlin function calls is a DSL, and so much editor tooling is built around real HTML: Tailwind's extension, Emmet, other HTML extensions, minifiers. AI models are trained on a lot of good HTML, too, and not on good HTML DSLs. That's a big reason pywire puts Python and real HTML in one `.wire` file, with language support for both. The Prettier plugin can defer to your usual HTML rules and your Python rules, and Ty and Ruff still apply to the Python. Plus, building a grammar was fun.

I'd still love to come back to Kotlin someday as a hobby project, on the model pywire has settled into. It could be an interesting alternative to Compose HTML.

# Tooling on day one

The very first commit had a language server and a VS Code extension in it, before the framework was anywhere near stable. A new file format without syntax highlighting, completions, or error squiggles is miserable to use, and I didn't want to design a language I wouldn't enjoy writing myself.

<!-- Q: Was editor support a deliberate day-one goal, or did it happen to come together fast? -->

The next day added the template attributes (`$if`, `$show`, `$bind`, `$for`), a compile-error page in the dev server, state that survives hot reloads, and one of my favorite small features: a `print()` in a server-side event handler shows up in your browser's console.

The language server itself went through three designs. It started on jedi, moved to generating shadow `.wire.py` files and running Pyright on them, and in February switched to [Ty](https://github.com/astral-sh/ty) with virtual documents, "as much faster LSP." Today the server transpiles `.wire` to Python with a source map, so a type error in your handler points at the right line of your `.wire` file.

I bet on Ty early because it's *really* fast. A slow language server is a real cost: people complain about the TypeScript language server in VS Code before version 7, because on a big project you end up flying blind while it catches up. Fast command-line tools matter for iterating, too. And Astral has earned the benefit of the doubt with uv, and it's getting a lot of investment.

# The parser, three times

The parser is the clearest example of how pywire actually got built: make it work, find where it breaks, and replace it.

1. **A hand-written HTML parser.** It lasted one day.
2. **lxml.** Good enough until the syntax grew. A `.wire` file mixes Python, HTML, CSS, and JavaScript, plus Python expressions inside attributes and text, and every tool needs to agree on where one language ends and the next begins.
3. **A tree-sitter grammar with a Rust parser.** On February 10 I rebuilt the parser on [tree-sitter](https://tree-sitter.github.io/) and made the grammar "the ground-truth for language." The compiler, language server, syntax highlighting, and Prettier plugin all read the same grammar, so they can't drift apart.

That February rewrite also forced syntax decisions. The Python section moved into an Astro-style `---` fence instead of a `---html---` separator, and a `$count` shorthand for `count.value` was removed "to alleviate grammar inconsistencies."

It came with a price. That same day I pushed more than a dozen `fix(ci)` commits trying to build the Rust parser for Linux wheels *and* for WebAssembly under Pyodide. Two months later I deleted the Rust. The parser became a pure-Python package on top of the same tree-sitter grammar, "so the grammar loads without platform-specific Rust wheels," which is what made pywire run on Pyodide and Cloudflare Python Workers.

In hindsight, the Rust parser was a mistake. It was premature optimization, plus compatibility work done mostly for the sake of the interactive tutorial. I should have planned more and approached it strategically, starting from what the framework actually needed.

<!--
Q (optional): What was the hardest parsing problem? (The history shows a long-running bug where the compiler hoisted
comprehension and loop variables onto the page object, e.g. a `for i in range(...)` making every
row's `toggle(i)` act on the last row. Worth a paragraph if you remember it.)
-->

**Lesson:** when several tools need to understand the same language, give them one grammar. And decide what the framework needs before optimizing for it.

# Reactivity, five times

If the parser went through three versions, reactivity went through five:

1. Plain top-level variables, which the compiler quietly moved onto the page instance.
2. An explicit `wire()` primitive (January 30), added "to be explicitly reactive and properly handle state and scoping issues," with a `$count` shorthand.
3. `wire`, `derived`, and `effect`, without the shorthand (February).
4. Svelte-style stores on top of that (April).
5. Stores removed again (May), in the only breaking-change commit on main.

The reason for that last step, from the pull request: the stores API "feels foreign next to `wire`/`derived`," module-level `wire()` already shares state across pages, and an `@effect` is behaviorally identical to subscribing to a store. "So the stores layer was largely redundant." What's left is `wire`, `derived`, and `producer`, and ordinary Python variables behave like ordinary Python variables.

I do miss the `$count` shorthand. The `$` is one of the symbols that makes pywire's syntax recognizable, and I liked the equivalent shorthand in Vue. But it made the grammar complex, and wires already overload enough operators that writing `.value` (or `.val`) to reassign one is good enough. It also makes it obvious where state changes.

This is where a line from pywire's contributor guide comes from: "The project has few users. Prefer clean breaks over compatibility." Pre-1.0 is the cheapest time to admit an API was wrong.

# One rule: the transport doesn't matter

pywire pages load over plain HTTP, but navigating between pages happens over the WebSocket, like a single-page app. For a while that had a nasty consequence: "SPA navigation via WebSocket bypassed the entire ASGI middleware stack. Auth, rate limiting, CORS — all skipped when the user clicked a link."

The fix replays each WebSocket navigation through the middleware stack as an internal request. It also became a design rule: middleware, auth, and sessions "must behave identically for HTTP loads and WebSocket SPA navigations. Never make app developers handle the two contexts differently." That rule shaped `pywire-auth` too, with OIDC providers, a local identity provider, and policies that fail closed.

# A tutorial that runs in your browser

The [interactive tutorial](https://pywire.dev/docs/tutorial/) has 34 steps, and every one runs pywire itself in your browser with Pyodide. There's no server to install. The server and the client both live in the page, with a shim standing in for the WebSocket between them.

Getting that right took about a dozen pull requests in one weekend: orphaned app instances after a preview reload, heartbeat timers that outlived their iframes, and eventually the realization that the WebSocket ping loop is pointless when "both ends are in-browser."

<!-- Q: Why invest that much in an in-browser tutorial? Has it changed how people find or try pywire? -->

# Shipping as one person

pywire started as a handful of separate repositories. In April I merged them into one monorepo with their history, and set up [release-please](https://github.com/googleapis/release-please) to version and publish each package on its own: Python packages to PyPI, a VS Code extension to the Marketplace and Open VSX, and, as of this week, `npx create-pywire-app` on npm. There have been 31 releases of the core package since then.

Solo release automation has its own problems. Packages depend on each other, so a release of the language server is only safe once the version of pywire it needs has been published. The repo now derives its dependency graph from the package manifests and gates every release on it. I also learned that "an extra `(`" in a pull-request title makes release-please silently drop the commit.

<!-- Q: Was a 12-package monorepo with this much release tooling worth it as a solo maintainer? -->

# Detours

Not everything made it. From February to March I built pywire-shell, "lightweight desktop apps with Python + HTML/CSS" on the Servo browser engine, with native macOS menus. The idea is to replace Electron and React Native some day: you'd build only the server side of an app, and it would handle the front end. It would also make the local security model simpler than Electron's or Tauri's. For now it's out of scope, so it was cut in the monorepo move.

The history also has two quiet stretches: March, and May through most of September.

Work and life got busy. I'd also been spending my time on the ring of add-ons around pywire's core and lost the plot a bit. Coming back meant writing a roadmap and refocusing on the core.

# Building it with AI agents

I build pywire with AI coding agents, and the split of work is deliberate. I decide the features, the developer experience, the interfaces, and the design patterns, and I keep the project aligned with its mission: a simple mental model and the best DX I can manage. The agents deliver pieces of those features iteratively, test first.

The setup lives in the repo. It started as a CLAUDE.md with agent skills in April, and in September it became an AGENTS.md so the same instructions work in Claude Code, Codex, Cursor, pi, and OpenCode. Design specs get written and reviewed before implementation starts.

# What I learned

<!-- Q: Pick the 3–4 that are genuinely yours; rewrite in your voice. -->

- **Tooling is the product.** Nobody adopts a language their editor doesn't understand.
- **One grammar, many consumers.** The tree-sitter grammar paid for itself in every tool that reads it.
- **Portability beats elegance.** The Rust parser was faster and harder to ship. The pure-Python one runs everywhere, including in a browser.
- **Break things before 1.0, on purpose.** Stores, slots, the `$` shorthand, and the old context API are all gone, and the framework is better for it.
- **Automate releases early.** It's what lets one person keep shipping twelve packages.

# What's next

The docs say pywire is pre-1.0 and "the API will tighten before v1."

What 1.0 means is laid out on pywire's roadmap.

<!-- TODO(Reece): paste the roadmap link (or its 1.0 criteria) so this section can summarize them. -->

If you want to try it, run `uvx create-pywire-app` (or `npx create-pywire-app`), then `uv run pywire dev`. The docs are at [pywire.dev](https://pywire.dev) and the source is at [github.com/pywire](https://github.com/pywire/pywire). I'd love to hear what you build.
