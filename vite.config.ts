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
        manualChunks: {
          // pdf.js is large and only needed once a bulletin is actually
          // loaded, so it is split out to protect first paint (NFR-3).
          pdfjs: ['pdfjs-dist'],
          charts: ['recharts'],
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
          name: 'ui',
          environment: 'jsdom',
          include: ['src/adapters/ui/**/*.test.tsx', 'src/adapters/ui/**/*.test.ts'],
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
