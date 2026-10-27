import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  appType: 'mpa',
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:4318', '/fixtures/api': 'http://127.0.0.1:4318' } },
  build: { outDir: 'dist' },
});
