import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Same-origin in development: the session cookie and API share the dev server's origin.
    // API_PORT lets the local mode (npm run dev:local) run beside a normal backend. The Origin header
    // is dropped because proxied calls are same-origin by construction; otherwise a dev server that
    // moved to another port (5173 taken) would be refused by the API's CORS check.
    proxy: Object.fromEntries(
      ['/api', '/uploads', '/rss.xml', '/sitemap.xml', '/robots.txt'].map((path) => [
        path,
        {
          target: `http://localhost:${process.env.API_PORT ?? '8080'}`,
          configure: (proxy) => {
            proxy.on('proxyReq', (req) => {
              req.removeHeader('origin');
            });
          },
        },
      ]),
    ),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
