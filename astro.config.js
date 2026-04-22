import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  // Enable React components in Astro
  integrations: [react()],

  // Site configuration
  site: 'https://ai-safety-academy.netlify.app/',

  // Build output
  outDir: './dist',

  // Public directory
  publicDir: './public',

  // Routing
  trailingSlash: 'never',

  // Build settings
  build: {
    format: 'directory', // URLs like /page/ instead of /page.html
  },

  // Markdown settings (for MDX support)
  markdown: {
    syntaxHighlight: 'shiki',
  },

  // Vite configuration (for MDX)
  vite: {
    ssr: {
      external: ['svgo'],
    },
  },
});
