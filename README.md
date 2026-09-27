# holmdahl.io | [Visit](https://holmdahl.io)

[![Deploy to Cloudflare Workers](https://github.com/reecelikesramen/holmdahl.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/reecelikesramen/holmdahl.io/actions/workflows/deploy.yml)

This is the source and content for [holmdahl.io](https://holmdahl.io) — my personal site for writing, showcasing work, and building in public.

---

## 🧰 Stack

- **Astro** for static site generation
- **React** for interactive UI islands
- **Tailwind CSS** for rapid styling
- **shadcn/ui** for accessible, headless components
- **GitHub Actions** for zero-cost CI/CD
- **Cloudflare Workers** for fast, global, serverless hosting

The design is heavily inspired by [Hugo PaperMod](https://github.com/adityatelange/hugo-PaperMod), reimplemented in a modern frontend stack.

---

## 🚀 Deployment

- **`main` branch** deploys automatically to production at [holmdahl.io](https://holmdahl.io)
- **All other branches** deploy to the preview environment at [preview.holmdahl.io](https://preview.holmdahl.io) (noindexed)

CI/CD is powered by GitHub Actions using Wrangler for automated publishing and rollouts.
