import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

export default defineProject({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    name: 'repo-tools',
    environment: 'node',
    globals: false,
    include: ['scripts/**/*.test.ts'],
    restoreMocks: true
  }
});
