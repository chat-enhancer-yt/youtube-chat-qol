import { defineConfig } from 'eslint/config';
import { defaultIgnores, javascriptConfig, typescriptConfig } from '@chatenhancer/eslint-config';

export default defineConfig([
  defaultIgnores(),
  javascriptConfig({
    files: ['eslint.config.mjs'],
    name: 'chat-enhancer/language-redirect-eslint-config',
    runtime: 'node'
  }),
  typescriptConfig({
    files: ['src/**/*.ts'],
    name: 'chat-enhancer/language-redirect-source',
    runtime: 'browser-node',
    tsconfigRootDir: import.meta.dirname
  }),
  typescriptConfig({
    files: ['vitest.config.ts'],
    name: 'chat-enhancer/language-redirect-config',
    runtime: 'node',
    tsconfigRootDir: import.meta.dirname
  })
]);
