import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Local dev only: forwards relative /api/* calls to the backend server
      // (npm run dev:server, port 3001) so you don't need VITE_API_URL set
      // locally. In production (Vercel), this proxy doesn't exist - set
      // VITE_API_URL to your Render backend URL instead.
      proxy: {
        '/api': {
          target: process.env.VITE_DEV_API_PROXY || 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
