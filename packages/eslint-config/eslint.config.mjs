import { defineConfig } from 'eslint/config';
import { defaultIgnores, javascriptConfig } from './index.mjs';

export default defineConfig([
  defaultIgnores(),
  javascriptConfig({
    files: ['**/*.mjs'],
    name: '@chatenhancer/eslint-config/node',
    runtime: 'node'
  })
]);
