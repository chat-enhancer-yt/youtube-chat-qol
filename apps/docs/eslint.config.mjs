import { defineConfig } from 'eslint/config';
import { defaultIgnores, javascriptConfig, typescriptConfig } from '@chatenhancer/eslint-config';

export default defineConfig([
  defaultIgnores(),
  typescriptConfig({
    files: ['src/**/*.ts'],
    name: 'chat-enhancer/docs-source',
    runtime: 'browser-node',
    tsconfigRootDir: import.meta.dirname
  }),
  typescriptConfig({
    files: ['vitest.config.ts'],
    name: 'chat-enhancer/docs-config',
    runtime: 'node',
    tsconfigRootDir: import.meta.dirname
  }),
  javascriptConfig({
    files: ['src/**/*.js'],
    ignores: ['src/**/*.test.js'],
    name: 'chat-enhancer/docs-browser',
    runtime: 'browser'
  }),
  javascriptConfig({
    files: ['astro.config.mjs', 'eslint.config.mjs', 'src/**/*.test.js'],
    name: 'chat-enhancer/docs-node',
    runtime: 'browser-node'
  })
]);
