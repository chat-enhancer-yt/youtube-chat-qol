import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['docs/**/*.test.{js,mjs,ts,tsx}'],
    restoreMocks: true
  }
});
