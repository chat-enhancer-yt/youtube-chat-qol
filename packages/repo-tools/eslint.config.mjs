import { defineConfig } from 'eslint/config';
import { defaultIgnores, javascriptConfig, typescriptConfig } from '@chatenhancer/eslint-config';

export default defineConfig([
  defaultIgnores(),
  javascriptConfig({
    files: ['eslint.config.mjs'],
    name: 'chat-enhancer/repo-tools-eslint-config',
    runtime: 'node'
  }),
  typescriptConfig({
    files: ['scripts/**/*.ts', 'vitest.unit.config.ts'],
    name: 'chat-enhancer/repo-tools',
    runtime: 'node',
    tsconfigRootDir: import.meta.dirname
  })
]);
