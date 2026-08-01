import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      include: [
        'src/**/*.ts',
        'src/**/*.tsx'
      ],
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage/unit'
    },
    environment: 'jsdom',
    globals: false,
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'scripts/**/*.test.mjs'
    ],
    restoreMocks: true,
    setupFiles: ['tests/setup.ts']
  }
});
