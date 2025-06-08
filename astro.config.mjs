// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import favicons from 'astro-favicons';
import react from '@astrojs/react';
import criticalCSS from 'astro-critical-css';

// https://astro.build/config
export default defineConfig({
  // Configure for GitHub Pages deployment
  site: import.meta.env.DEV ? 'http://localhost:4321' : 'https://reecelikesramen.github.io',
  base: import.meta.env.DEV ? '/' : '/holmdahl.io/',

  prefetch: {
    defaultStrategy: 'hover',
    prefetchAll: true,
  },
  
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: true,
      assetsInlineLimit: 2048, // Inline assets smaller than 2KB
      rollupOptions: {
        output: {
          manualChunks: {
            'search': ['./src/components/SearchDialog.tsx', './src/components/SearchButton.tsx'],
            'profile-animation': ['./src/components/ProfileImageWrapper.tsx']
          }
        }
      }
    }
  },

  build: {
    inlineStylesheets: 'auto',
    assets: '_astro'
  },

  integrations: [
    react(), 
    favicons(),
    criticalCSS({
      width: 1300,
      height: 900,
      extract: true,
      htmlPathRegex: '.*\\.html$',
      silent: false
    })
  ]
});