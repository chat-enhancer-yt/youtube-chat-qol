import { defineConfig } from 'eslint/config';
import { defaultIgnores, javascriptConfig, typescriptConfig } from '@chatenhancer/eslint-config';

export default defineConfig([
  defaultIgnores(),
  javascriptConfig({
    files: ['eslint.config.mjs'],
    name: 'chat-enhancer/playground-core-eslint-config',
    runtime: 'node'
  }),
  typescriptConfig({
    files: ['src/**/*.ts'],
    name: 'chat-enhancer/playground-core-source',
    runtime: 'browser-node',
    tsconfigRootDir: import.meta.dirname
  }),
  typescriptConfig({
    files: ['vitest.unit.config.ts'],
    name: 'chat-enhancer/playground-core-config',
    runtime: 'node',
    tsconfigRootDir: import.meta.dirname
  })
]);
