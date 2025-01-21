const typescriptParser = require('@typescript-eslint/parser');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');

/** @type {import('eslint').Flat.Config[]} */
module.exports = [
  {
    ignores: [
      'build/',
      'node_modules/',
      'bin/',
      '*.d.ts',
      'dist/',
      'coverage/',
      'packages/hydrogen-react/codegen.ts',
      'packages/hydrogen-react/vite.config.ts',
      'packages/hydrogen-react/vitest.setup.ts',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    settings: {
      'import/resolvers': {
        typescript: {
          project: ['packages/*/tsconfig.json', 'templates/*/tsconfig.json'],
        },
      },
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
    },
  },
];
