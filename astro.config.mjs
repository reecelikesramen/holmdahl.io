// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import favicons from 'astro-favicons';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Configure for GitHub Pages deployment
  site: 'https://reecelikesramen.github.io',
  base: '/holmdahl.io/',
  // site: 'https://holmdahl.io',
  // base: '/',
  
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: false,
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

  integrations: [react(), favicons()]
});