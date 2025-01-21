const {fixupConfigRules, fixupPluginRules} = require('@eslint/compat');
const eslintComments = require('eslint-plugin-eslint-comments');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const jsxA11Y = require('eslint-plugin-jsx-a11y');
const tsdoc = require('eslint-plugin-tsdoc');
const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const jest = require('eslint-plugin-jest');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const js = require('@eslint/js');
const {FlatCompat} = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = [
  {
    ignores: [
      '**/node_modules/',
      '**/build/',
      '**/*.graphql.d.ts',
      '**/*.graphql.ts',
      '**/storefront-api-types.d.ts',
      '**/customer-account-api-types.d.ts',
      '**/codegen.ts',
      '**/dist/**/*',
      '**/coverage/**/*',
      '**/docs/**/*',
      '**/.eslintrc.cjs',
      '**/src/*.example.tsx',
      '**/src/*.example.ts',
      '**/src/*.example.jsx',
      '**/src/*.example.js',
      '**/eslint.config.cjs',
      '**/scripts/**/*',
    ],
  },
  ...fixupConfigRules(
    compat.extends(
      'plugin:node/recommended',
      'plugin:import/recommended',
      'plugin:import/typescript',
      'eslint:recommended',
      'plugin:eslint-comments/recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'plugin:jsx-a11y/recommended',
    ),
  ),
  {
    plugins: {
      'eslint-comments': fixupPluginRules(eslintComments),
      react: fixupPluginRules(react),
      'react-hooks': fixupPluginRules(reactHooks),
      'jsx-a11y': fixupPluginRules(jsxA11Y),
      tsdoc,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ['vite.config.ts', 'vitest.setup.ts'],
        },
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      ecmaVersion: 2020,
      sourceType: 'module',
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
      '@shopify/jsx-no-complex-expressions': 'off',
      '@shopify/jsx-no-hardcoded-content': 'off',
      'jsx-a11y/control-has-associated-label': 'off',
      'jsx-a11y/label-has-for': 'off',
      'no-use-before-define': 'off',
      'no-warning-comments': 'off',
      'object-shorthand': [
        'error',
        'always',
        {
          avoidQuotes: true,
        },
      ],
      'react/display-name': 'off',
      'react/no-array-index-key': 'warn',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'eslint-comments/no-unused-disable': 'off',
      'jest/no-disabled-tests': 'off',
      'jest/no-export': 'off',
      'no-console': 'off',
      'no-constant-condition': 'off',
      'tsdoc/syntax': 'error',
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
      'prefer-const': [
        'warn',
        {
          destructuring: 'all',
        },
      ],
      '@typescript-eslint/naming-convention': 'off',
      'import/extensions': ['error', 'ignorePackages'],
      'import/no-unresolved': 'off',
      'node/no-missing-import': 'off',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  ...compat.extends('plugin:jest/recommended').map((config) => ({
    ...config,
    files: ['**/*.test.*'],
  })),
  {
    files: ['**/*.test.*'],
    plugins: {
      jest,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  {
    files: ['**/*.server.*'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  ...fixupConfigRules(
    compat.extends(
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ),
  ).map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ['vite.config.ts', 'vitest.setup.ts'],
        },
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  })),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ['vite.config.ts', 'vitest.setup.ts'],
        },
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allowSingleOrDouble',
          trailingUnderscore: 'allowSingleOrDouble',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'typeParameter',
          format: ['PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
        },
        {
          selector: 'property',
          format: null,
        },
      ],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    files: ['src/*.example.?(ts|js|tsx|jsx)'],
    rules: {
      'node/no-extraneous-import': 'off',
      'node/no-extraneous-require': 'off',
    },
  },
  {
    files: ['src/index.ts'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['src/**/!(*.test|*.example|*.doc|*.stories).?(ts|js|tsx|jsx)'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'error',
    },
  },
];
