import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.saumya-verma.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
