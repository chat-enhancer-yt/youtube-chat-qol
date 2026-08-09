import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

export default defineProject({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    name: 'playground-core',
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
    restoreMocks: true
  }
});
