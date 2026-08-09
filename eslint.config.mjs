import { defineConfig } from 'eslint/config';
import { defaultIgnores, javascriptConfig } from '@chatenhancer/eslint-config';

export default defineConfig([
  defaultIgnores(),
  javascriptConfig({
    files: ['eslint.config.mjs', 'vitest.config.mjs'],
    name: '@chatenhancer/root/config',
    runtime: 'node'
  })
]);
