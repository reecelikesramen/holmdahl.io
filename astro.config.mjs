// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Configure for GitHub Pages deployment
  site: process.env.GITHUB_PAGES_SITE || 'https://localhost:4321',
  base: process.env.GITHUB_PAGES_BASE || '/',
  
  vite: {
      plugins: [tailwindcss()]
	},

  integrations: [react()]
});