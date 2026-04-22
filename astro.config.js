import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

export default defineConfig({
  // Enable integrations
  integrations: [
    react(),
    mdx(),
  ],

  // Site configuration
  site: 'https://ai-safety-academy.netlify.app/',

  // Source and output directories
  root: '.',
  srcDir: './src',
  outDir: './dist',
  publicDir: './public',

  // Routing configuration
  trailingSlash: 'never',

  // Build settings
  build: {
    format: 'directory',
  },

  // Markdown/MDX settings
  markdown: {
    syntaxHighlight: 'shiki',
  },

  // Vite configuration
  vite: {
    ssr: {
      external: ['svgo'],
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },
});
