import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintCommentsPlugin from 'eslint-plugin-eslint-comments';
import reactRecommended from 'eslint-plugin-react/configs/recommended.js';
import reactJsxRuntime from 'eslint-plugin-react/configs/jsx-runtime.js';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import jestPlugin from 'eslint-plugin-jest';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';

/** @type {import('eslint').Flat.Config[]} */
export default [
  // Base configuration for all files
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    ignores: [
      'node_modules/',
      'build/',
      'bin/',
      '*.d.ts',
      'dist/',
      '*.graphql.d.ts',
      '*.graphql.ts',
      '!**/.server',
      '!**/.client',
    ],
  },

  // JavaScript/JSX files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ...js.configs.recommended,
    ...reactRecommended,
    ...reactJsxRuntime,
    plugins: {
      react: reactPlugin,
      'eslint-comments': eslintCommentsPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        document: 'readonly',
        navigator: 'readonly',
        window: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
      formComponents: ['Form'],
      linkComponents: [
        {name: 'Link', linkAttribute: 'to'},
        {name: 'NavLink', linkAttribute: 'to'},
      ],
    },
    rules: {
      'eslint-comments/disable-enable-pair': 'error',
      'eslint-comments/no-unused-disable': 'error',
      'no-console': ['warn', {allow: ['warn', 'error']}],
      'no-use-before-define': 'off',
      'no-warning-comments': 'off',
      'no-useless-escape': 'off',
      'object-shorthand': ['error', 'always', {avoidQuotes: true}],

      // React specific rules
      'react/display-name': 'off',
      'react/no-array-index-key': 'warn',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',

      // JSX A11y rules
      'jsx-a11y/control-has-associated-label': 'off',
      'jsx-a11y/label-has-for': 'off',

      // Other plugin rules
      '@shopify/jsx-no-complex-expressions': 'off',
      '@shopify/jsx-no-hardcoded-content': 'off',
    },
  },

  // TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      import: importPlugin,
    },
    languageOptions: {
      parser: typescriptParser,
    },
    settings: {
      'import/internal-regex': '^~/',
      'import/resolver': {
        node: {
          extensions: ['.ts', '.tsx'],
        },
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Test files
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
        jest: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  },

  // Server files
  {
    files: ['*.server.*'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },

  // Apply Prettier last
  eslintConfigPrettier,
];
