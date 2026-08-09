import { defineConfig } from 'eslint/config';
import {
  defaultIgnores,
  extensionPlugin,
  javascriptConfig,
  typescriptConfig
} from '@chatenhancer/eslint-config';

const productionSourceFiles = ['src/**/*.ts', 'src/**/*.tsx'];
const productionSourceIgnores = ['src/**/*.test.ts', 'src/**/*.test.tsx'];

export default defineConfig([
  defaultIgnores(),
  javascriptConfig({
    files: ['eslint.config.mjs'],
    name: 'chat-enhancer/extension-config',
    runtime: 'node'
  }),
  typescriptConfig({
    files: productionSourceFiles,
    name: 'chat-enhancer/extension-source',
    runtime: 'browser',
    tsconfigRootDir: import.meta.dirname
  }),
  typescriptConfig({
    files: [
      'e2e/**/*.ts',
      'playwright*.config.ts',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'vitest.setup.ts',
      'vitest.unit.config.ts'
    ],
    name: 'chat-enhancer/extension-tests',
    runtime: 'browser-node',
    tsconfigRootDir: import.meta.dirname
  }),
  {
    name: 'chat-enhancer/extension-managed-dom',
    files: productionSourceFiles,
    ignores: [...productionSourceIgnores, 'src/shared/jsx-dom.ts', 'src/shared/managed-dom.ts'],
    plugins: {
      ytcq: extensionPlugin
    },
    rules: {
      'ytcq/no-direct-jsx-factory': 'error',
      'ytcq/no-direct-ytcq-create-element': 'error',
      'ytcq/require-jsx-dom-el-type': 'error'
    }
  },
  {
    name: 'chat-enhancer/extension-features',
    files: ['src/features/**/*.ts', 'src/features/**/*.tsx'],
    ignores: productionSourceIgnores,
    plugins: {
      ytcq: extensionPlugin
    },
    rules: {
      'ytcq/no-hardcoded-visible-ui-literals': 'warn',
      'ytcq/no-direct-ytcq-create-element': 'error',
      'ytcq/prefer-shared-youtube-selectors': 'warn',
      'ytcq/require-global-listener-signal': 'error',
      'ytcq/require-managed-create-element': 'error'
    }
  },
  {
    name: 'chat-enhancer/extension-popup',
    files: ['src/popup/**/*.ts', 'src/popup/**/*.tsx'],
    ignores: productionSourceIgnores,
    plugins: {
      ytcq: extensionPlugin
    },
    rules: {
      'ytcq/no-hardcoded-visible-ui-literals': 'warn',
      'ytcq/require-managed-create-element': 'error'
    }
  }
]);
