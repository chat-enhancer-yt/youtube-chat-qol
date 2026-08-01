import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vitest/config';

function rawHtmlTextModules() {
  return {
    name: 'raw-html-text-modules',
    enforce: 'pre' as const,
    async load(id: string) {
      if (!id.endsWith('.html')) return null;
      return `export default ${JSON.stringify(await readFile(id, 'utf8'))};`;
    }
  };
}

export default defineConfig({
  plugins: [rawHtmlTextModules()],
  test: {
    environment: 'node',
    globals: false,
    include: ['cloudflare/**/*.test.ts'],
    restoreMocks: true,
    setupFiles: ['cloudflare/vitest.setup.ts']
  }
});
