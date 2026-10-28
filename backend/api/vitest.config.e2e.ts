import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: {
      JWT_SECRET: 'test-vitest-environment-secret-key-min-32-chars!',
      ALLOW_IN_MEMORY_FALLBACK: 'true',
    },
  },
});
