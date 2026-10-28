import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    testTimeout: 30000,
    env: {
      JWT_SECRET: 'test-vitest-environment-secret-key-min-32-chars!',
      ALLOW_IN_MEMORY_FALLBACK: 'true',
    },
  },
});
