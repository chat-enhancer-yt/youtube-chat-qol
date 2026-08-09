import { defineConfig } from 'eslint/config';
import { defaultIgnores, javascriptConfig, typescriptConfig } from '@chatenhancer/eslint-config';

export default defineConfig([
  defaultIgnores(),
  typescriptConfig({
    files: ['vitest.config.ts'],
    name: 'chat-enhancer/root-typescript',
    runtime: 'node',
    tsconfigRootDir: import.meta.dirname
  }),
  javascriptConfig({
    files: ['eslint.config.mjs'],
    name: 'chat-enhancer/root-node',
    runtime: 'node'
  })
]);
