const typescriptParser = require('@typescript-eslint/parser');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');
const eslintJs = require('@eslint/js');
const eslintCommentsPlugin = require('@eslint-community/eslint-plugin-eslint-comments');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const jsxA11yPlugin = require('eslint-plugin-jsx-a11y');
const prettierPlugin = require('eslint-plugin-prettier');
const nodePlugin = require('eslint-plugin-node');
const importPlugin = require('eslint-plugin-import');
const jestPlugin = require('eslint-plugin-jest');
const tsdocPlugin = require('eslint-plugin-tsdoc');
const simpleImportSortPlugin = require('eslint-plugin-simple-import-sort');
const {fixupPluginRules} = require('@eslint/compat');

/** @type {import('eslint').Flat.Config[]} */
module.exports = [
  // Base configuration
  {
    ignores: [
      'node_modules/',
      'build/',
      '*.graphql.d.ts',
      '*.graphql.ts',
      '**/storefront-api-types.d.ts',
      '**/customer-account-api-types.d.ts',
      '**/codegen.ts',
      '**/dist/**',
      '**/coverage/**',
      '**/docs/**',
      '**/.eslintrc.cjs',
      '**/src/*.example.tsx',
      '**/src/*.example.ts',
      '**/src/*.example.jsx',
      '**/src/*.example.js',
    ],
  },
  // Default configuration for all files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ...eslintJs.configs.recommended,
    plugins: {
      'eslint-comments': eslintCommentsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      prettier: prettierPlugin,
      node: fixupPluginRules(nodePlugin),
      import: importPlugin,
      '@typescript-eslint': typescriptPlugin,
      tsdoc: tsdocPlugin,
      'simple-import-sort': simpleImportSortPlugin,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: '.',
        ecmaFeatures: {
          jsx: true,
        },
        sourceType: 'module',
      },
      ecmaVersion: 2021,
    },
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    settings: {
      react: {
        version: 'detect',
      },
      jest: {
        version: 28,
      },
    },
    rules: {
      // TypeScript
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',

      // React
      'react/display-name': 'off',
      'react/no-array-index-key': 'warn',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/exhaustive-deps': 'error',

      // A11y
      'jsx-a11y/control-has-associated-label': 'off',
      'jsx-a11y/label-has-for': 'off',

      // Node
      'node/no-extraneous-import': [
        'error',
        {
          allowModules: ['@shopify/hydrogen', '@shopify/react-testing'],
        },
      ],
      'node/no-extraneous-require': [
        'error',
        {
          allowModules: ['@shopify/hydrogen'],
        },
      ],
      'node/no-unsupported-features/es-syntax': 'off',
      'node/no-unsupported-features/es-builtins': [
        'error',
        {
          version: '>=14.0.0',
          ignores: [],
        },
      ],
      'node/no-unsupported-features/node-builtins': [
        'error',
        {
          version: '>=14.0.0',
          ignores: [],
        },
      ],
      'node/no-missing-import': 'off',

      // Import/Export
      'import/extensions': ['error', 'ignorePackages'],
      'import/no-unresolved': 'off',
      'simple-import-sort/exports': 'error',

      // General
      'no-console': 'off',
      'no-use-before-define': 'off',
      'no-warning-comments': 'off',
      'no-constant-condition': 'off',
      'object-shorthand': ['error', 'always', {avoidQuotes: true}],
      'prefer-const': ['warn', {destructuring: 'all'}],

      // Testing
      'jest/no-disabled-tests': 'off',
      'jest/no-export': 'off',

      // Other
      'eslint-comments/no-unused-disable': 'off',
      'tsdoc/syntax': 'error',
    },
  },
  // Test files configuration
  {
    files: ['*.test.*'],
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
    },
    languageOptions: {
      globals: {
        jest: true,
        expect: true,
        describe: true,
        it: true,
        beforeEach: true,
        afterEach: true,
      },
    },
  },
  // Server files configuration
  {
    files: ['*.server.*'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  // TypeScript files configuration
  {
    files: ['*.ts', '*.tsx'],
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react/prop-types': 'off',
    },
  },
  // Example files configuration
  {
    files: ['src/*.example.?(ts|js|tsx|jsx)'],
    rules: {
      'node/no-extraneous-import': 'off',
      'node/no-extraneous-require': 'off',
    },
  },
  // Index.ts configuration
  {
    files: ['src/index.ts'],
    plugins: {
      'simple-import-sort': simpleImportSortPlugin,
    },
    rules: {
      'simple-import-sort/exports': 'error',
    },
  },
  // Source files configuration (excluding tests, examples, etc.)
  {
    files: ['src/**/!(*.test|*.example|*.doc|*.stories).?(ts|js|tsx|jsx)'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'error',
    },
  },
];
