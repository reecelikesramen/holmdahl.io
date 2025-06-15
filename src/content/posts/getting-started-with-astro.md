---
title: Getting Started with Astro
description: Learn how to build fast, content-focused websites with Astro
draft: true
pubDate: 2024-01-15T00:00:00.000Z
tags: [astro, web-development, static-site-generator]
showReadingTime: true
showToc: true
tocOpen: true
---

# Test

# Getting Started with Astro

Astro is a modern static site generator that allows you to build faster websites with less JavaScript. Let's explore how to get started with Astro.

A [test link](https://google.com)

## Installation

First, create a new Astro project:

```bash
# create a new project with npm
npm create astro@latest

# or yarn
yarn create astro

# or pnpm
pnpm create astro
```

## Project Structure

Astro projects typically follow this structure:

```
├── public/
├── src/
│   ├── components/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
└── package.json
```

## Building Components

Astro components use a familiar HTML-like syntax:

```astro
---
// Component Script (JavaScript)
const greeting = "Hello";
const name = "Astro";
---

<!-- Component Template (HTML + JS Expressions) -->
<div>
  <h1>{greeting}, {name}!</h1>
  <p>Welcome to Astro</p>
</div>

<style>
  /* Component Styles (Scoped by default) */
  h1 {
    color: purple;
  }
</style>
```

## Why Choose Astro?

1. **Zero JavaScript by default**: Send only HTML and CSS to the browser
2. **Component Islands**: Add interactivity only where needed
3. **Supports multiple frameworks**: Use React, Vue, Svelte, etc. together
4. **Full-featured**: Built-in Markdown, file-based routing, and more

I'm really enjoying working with Astro so far! 

# Headers!

## h2

### h3

#### h4

##### h5

###### h6