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

const lintedTSPackages = [
  'packages/hydrogen-react',
  'examples/express',
  'templates/skeleton',
  'docs/previews',
];

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
      'bin/',
      '*.d.ts',
      'packages/hydrogen-react/codegen.ts',
      'packages/hydrogen-react/vite.config.ts',
      'packages/hydrogen-react/vitest.setup.ts',
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
    },
    settings: {
      'import/resolvers': {
        typescript: {
          project: [
            'packages/*/tsconfig.json',
            'templates/*/tsconfig.json',
            'examples/*/tsconfig.json',
            'docs/*/tsconfig.json',
          ],
        },
      },
      react: {
        version: 'detect',
      },
      jest: {
        version: 28,
      },
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
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
    rules: {
      'jsx-a11y/control-has-associated-label': 'off',
      'jsx-a11y/label-has-for': 'off',
      'no-use-before-define': 'off',
      'no-warning-comments': 'off',
      'react/no-children-prop': 'off',
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
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'import/extensions': 'off',
      'import/no-unresolved': 'off',
      'node/no-missing-import': 'off',
      'react-hooks/exhaustive-deps': 'error',
      'react/jsx-no-target-blank': 'off',
      'node/no-extraneous-import': 'off',
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
    files: ['**/*.ts', '**/*.tsx'],
    settings: {
      'import/resolvers': {
        typescript: {
          project: [
            'packages/*/tsconfig.json',
            'templates/*/tsconfig.json',
            'examples/*/tsconfig.json',
            'docs/*/tsconfig.json',
          ],
        },
      },
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            'vite.config.ts',
            'vitest.setup.ts',
            'tsup.config.ts',
            'vitest.config.ts',
          ],
        },
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'prefer-const': 'off',
    },
  },
  {
    files: ['**/*.server.*'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    files: [
      ...lintedTSPackages.flatMap((pkg) => [
        `${pkg}/**/*.ts`,
        `${pkg}/**/*.tsx`,
      ]),
    ],
    rules: {
      // handled by @typescript-eslint
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'tsdoc/syntax': 'error',
      'no-empty': 'off',
      'react/jsx-no-target-blank': 'error',
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
    },
    plugins: {
      tsdoc,
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
    files: [
      ...lintedTSPackages.flatMap((pkg) => [
        `${pkg}/**/*.ts`,
        `${pkg}/**/*.tsx`,
      ]),
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  })),
  {
    files: [
      '**/*.example.ts',
      '**/*.example.js',
      '**/*.example.tsx',
      '**/*.example.jsx',
    ],
    rules: {
      'node/no-extraneous-import': 'off',
      'node/no-extraneous-require': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'import/no-duplicates': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'prefer-const': 'off',
      'import/no-named-as-default': 'off',
    },
  },
  {
    files: ['**/src/index.ts'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/exports': 'error',
    },
  },
];
