import { defineConfig } from 'eslint/config';
import { defaultIgnores, javascriptConfig, typescriptConfig } from '@chatenhancer/eslint-config';

export default defineConfig([
  defaultIgnores(),
  javascriptConfig({
    files: ['eslint.config.mjs'],
    name: 'chat-enhancer/playground-eslint-config',
    runtime: 'node'
  }),
  typescriptConfig({
    files: ['src/**/*.ts'],
    name: 'chat-enhancer/playground-source',
    runtime: 'browser-node',
    tsconfigRootDir: import.meta.dirname
  }),
  typescriptConfig({
    files: ['vitest.config.ts', 'vitest.setup.ts'],
    name: 'chat-enhancer/playground-config',
    runtime: 'node',
    tsconfigRootDir: import.meta.dirname
  })
]);
