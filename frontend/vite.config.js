import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const sharedDir = fileURLToPath(new URL('../shared', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // `@shared/goals.json` points at the config shared with the Python backend
    alias: { '@shared': sharedDir },
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep Chart.js in its own cached chunk
        manualChunks: { charts: ['chart.js'] },
      },
    },
  },
  test: { environment: 'node' },
});
