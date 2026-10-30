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
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          history: path.resolve(__dirname, 'history.html'),
          where: path.resolve(__dirname, 'where.html'),
          when: path.resolve(__dirname, 'when.html'),
          why: path.resolve(__dirname, 'why.html'),
          how: path.resolve(__dirname, 'how.html'),
          before: path.resolve(__dirname, 'before.html'),
          now: path.resolve(__dirname, 'now.html'),
          after: path.resolve(__dirname, 'after.html'),
          gallery: path.resolve(__dirname, 'gallery.html'),
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
