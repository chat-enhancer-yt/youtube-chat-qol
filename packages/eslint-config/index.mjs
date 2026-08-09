import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import extensionPlugin from './plugin.mjs';

const runtimeGlobals = {
  browser: {
    ...globals.browser,
    chrome: 'readonly',
    WebSocketPair: 'readonly'
  },
  'browser-node': {
    ...globals.browser,
    ...globals.node,
    chrome: 'readonly',
    WebSocketPair: 'readonly'
  },
  node: globals.node
};

const typescriptRules = {
  ...js.configs.recommended.rules,
  ...tseslint.configs.recommended.rules,
  'no-undef': 'off',
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  '@typescript-eslint/no-explicit-any': 'off'
};

export { extensionPlugin };

export function defaultIgnores() {
  return {
    name: '@chatenhancer/ignores',
    ignores: ['coverage/**', 'dist/**', 'node_modules/**']
  };
}

export function javascriptConfig({
  files,
  ignores,
  name = '@chatenhancer/javascript',
  runtime = 'node',
  rules = {}
}) {
  return {
    name,
    files,
    ...(ignores ? { ignores } : {}),
    languageOptions: {
      globals: getRuntimeGlobals(runtime)
    },
    rules: {
      ...js.configs.recommended.rules,
      ...rules
    }
  };
}

export function typescriptConfig({
  files,
  ignores,
  name = '@chatenhancer/typescript',
  rules = {},
  runtime = 'browser',
  tsconfigRootDir
}) {
  return {
    name,
    files,
    ...(ignores ? { ignores } : {}),
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir
      },
      globals: getRuntimeGlobals(runtime)
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    rules: {
      ...typescriptRules,
      ...rules
    }
  };
}

function getRuntimeGlobals(runtime) {
  const selected = runtimeGlobals[runtime];
  if (!selected) throw new Error(`Unsupported ESLint runtime: ${runtime}`);
  return selected;
}
