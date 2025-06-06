// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Configure for GitHub Pages deployment
  site: 'https://reecelikesramen.github.io',
  base: '/holmdahl.io/',
  // site: 'https://holmdahl.io',
  // base: '/',
  
  vite: {
      plugins: [tailwindcss()]
	},

  integrations: [react()]
});