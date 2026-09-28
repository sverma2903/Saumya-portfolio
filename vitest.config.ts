import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// P0 · tests/unit + tests/data run before the build (`npm test`); tests/dist runs after it (`npm run test:dist`).
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60_000,
  },
});
