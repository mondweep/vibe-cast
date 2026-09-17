import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@somnus/domain': resolve(__dirname, '../packages/domain/src/index.ts') },
  },
  build: { outDir: 'dist', sourcemap: false },
});
