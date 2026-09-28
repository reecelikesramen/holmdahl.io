// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import favicons from 'astro-favicons';
import react from '@astrojs/react';
import remarkDefinitionList, { defListHastHandlers } from 'remark-definition-list'
import { remarkReadingTime } from './astro-plugins/remark-reading-time.mjs';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import partytown from '@astrojs/partytown';

import mdx from '@astrojs/mdx';

import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';

// TextMate grammar for pywire's .wire files, vendored from
// github.com/pywire/pywire (packages/vscode-pywire/syntaxes)
const wireGrammar = JSON.parse(fs.readFileSync(new URL('./src/grammars/pywire.tmLanguage.json', import.meta.url), 'utf-8'));

// https://astro.build/config
export default defineConfig({
  site: import.meta.env.DEV ? 'http://localhost:4321' : 'https://holmdahl.io',

  base: '/',

  env: {
    schema: {
      // Set to "preview" by CI for non-main branches so preview deploys are noindexed
      SITE_ENV: envField.enum({ context: 'server', access: 'public', values: ['production', 'preview'], default: 'production' }),
    },
  },
  trailingSlash: 'never',
  compressHTML: true,

  prefetch: {
    defaultStrategy: 'hover',
    prefetchAll: true,
  },

  markdown: {
    shikiConfig: {
      themes: { light: 'gruvbox-light-soft', dark: 'gruvbox-dark-soft' },
      defaultColor: false,
      langs: [
        'python',
        'javascript',
        'css',
        {
          ...wireGrammar,
          name: 'wire',
          aliases: ['pywire'],
          embeddedLangs: ['python', 'javascript', 'css'],
        },
      ],
    },
    processor: unified({
      remarkPlugins: [remarkDefinitionList, remarkReadingTime],
      rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'append' }]],
      remarkRehype: {
        handlers: {
          ...defListHastHandlers,
        }
      }
    }),
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: true,
      assetsInlineLimit: 2048, // Inline assets smaller than 2KB
    },
  },

  build: {
    inlineStylesheets: 'auto',
    assets: '_astro'
  },

  integrations: [react(), favicons(), mdx(), sitemap({
    filter: (page) => !page.endsWith('/404'),
  }), partytown({
    config: {
      forward: ["dataLayer.push"],
      debug: false
    }
  })]
});