/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // pdf.js is large and only needed once a bulletin is actually loaded,
        // so it is split out to protect first paint (NFR-3). Written as a
        // function because Rollup's object form is no longer in the accepted
        // type union.
        manualChunks(id: string) {
          // Vite's dynamic-import preload helper is a shared module, and left
          // to itself the bundler folds it into the first chunk that needs it —
          // which is `pdfjs`. The entry then *statically* imports the very
          // chunk we split out to keep off the first paint, and pdf.js is
          // lazy in name only. Pinning the helper to a chunk the entry already
          // loads eagerly keeps the dynamic import genuinely dynamic (NFR-3).
          // (A chunk of its own gets merged straight back, being ~1 kB.)
          if (id.includes('preload-helper')) return 'charts';
          if (id.includes('node_modules/pdfjs-dist')) return 'pdfjs';
          if (id.includes('node_modules/recharts')) return 'charts';
          return undefined;
        },
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'domain',
          environment: 'node',
          include: [
            'src/domain/**/*.test.ts',
            'src/application/**/*.test.ts',
            'src/adapters/pdf/**/*.test.ts',
            'src/adapters/persistence/**/*.test.ts',
            'src/architecture.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          // Build-time scripts are not shipped, but they are load-bearing: the
          // Drive sync decides what enters `fixtures/`, so its pure parts are
          // held to the same standard as the app's.
          name: 'scripts',
          environment: 'node',
          include: ['scripts/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/adapters/ui/**/*.test.tsx', 'src/adapters/ui/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          // The composition root wires adapters to the domain and mounts the
          // console, so its tests need a DOM even though most of them assert
          // arithmetic rather than markup.
          name: 'composition',
          environment: 'jsdom',
          include: ['src/composition/**/*.test.tsx', 'src/composition/**/*.test.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/application/**'],
      exclude: ['**/*.test.ts', '**/index.ts'],
      thresholds: {
        // NFR-9: the domain is the product; hold it to a high bar.
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
