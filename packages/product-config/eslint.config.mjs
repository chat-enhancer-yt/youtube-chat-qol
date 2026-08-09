import { defineConfig } from 'eslint/config';
import { defaultIgnores, javascriptConfig, typescriptConfig } from '@chatenhancer/eslint-config';

export default defineConfig([
  defaultIgnores(),
  javascriptConfig({
    files: ['eslint.config.mjs'],
    name: 'chat-enhancer/product-config-eslint-config',
    runtime: 'node'
  }),
  typescriptConfig({
    files: ['src/**/*.ts'],
    name: 'chat-enhancer/product-config-source',
    runtime: 'node',
    tsconfigRootDir: import.meta.dirname
  })
]);
