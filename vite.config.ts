import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// Production only: blocks every network request after load (research R2, SC-006). Dev mode skips
// it because Vite's HMR needs a WebSocket.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "connect-src 'none'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'zipf:content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  worker: { format: 'es' },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
      // Quality Standards (research R10): 80% lines overall, 90% for pure logic in src/lib.
      thresholds: {
        lines: 80,
        'src/lib/**': { lines: 90 },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'src/lib/**/*.test.ts',
            'src/worker/**/*.test.ts',
            'tests/contract/**/*.test.ts',
          ],
          // Needs a DOM (Blob URLs + <a download>), so it runs in the dom project.
          exclude: ['src/lib/download.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: [
            'src/*.test.tsx',
            'src/components/**/*.test.tsx',
            'src/hooks/**/*.test.ts',
            'src/lib/download.test.ts',
          ],
          setupFiles: ['src/test/setup.ts'],
        },
      },
      {
        // Timing budgets only: run by `npm run bench`, never by `npm test`.
        extends: true,
        test: {
          name: 'perf',
          environment: 'node',
          include: ['tests/perf/**/*.test.ts'],
          testTimeout: 60_000,
        },
      },
    ],
  },
});
