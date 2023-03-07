module.exports = {
  settings: {
    jest: {
      version: 28,
    },
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['eslint-plugin-tsdoc'],
  ignorePatterns: [
    '**/storefront-api-types.d.ts',
    '**/dist/**',
    '**/coverage/**',
    '**/docs/**',
    '**/.eslintrc.cjs',
    '**/src/*.example.tsx',
    '**/src/*.example.ts',
    '**/src/*.example.jsx',
    '**/src/*.example.js',
  ],
  extends: [
    'plugin:node/recommended',
    'plugin:hydrogen/recommended',
    'plugin:hydrogen/typescript',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
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
    // "node/no-unpublished-import": "off",
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-unsupported-features/es-builtins': [
      'error',
      // We need to manually specify a min-version since we can't use `engine`
      {
        version: '>=14.0.0',
        ignores: [],
      },
    ],
    'node/no-unsupported-features/node-builtins': [
      'error',
      // We need to manually specify a min-version since we can't use `engine`
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

    // ensure that file extensions are used from now on
    'import/extensions': ['error', 'ignorePackages'],
    // next two are turned off because of the conflict between TS requiring .js extensions and those .js files not actually existing in the filesystem
    'import/no-unresolved': 'off',
    'node/no-missing-import': 'off',
    // next two are important that they're not ignored, so change them to errors
    '@typescript-eslint/no-explicit-any': 'error',
    'react-hooks/exhaustive-deps': 'error',
  },
  overrides: [
    {
      // for .example.tsx files, we want to show the import for our own package, so we turn off the eslint rules for extraneous imports
      files: ['src/*.example.?(ts|js|tsx|jsx)'],
      rules: {
        'node/no-extraneous-import': 'off',
        'node/no-extraneous-require': 'off',
      },
    },
    {
      // only for the index.ts file, apply the simple-import-sort rules so that exports are sorted alphabetically.
      // it doesn't matter for any other file, but it's good for index.ts because it helps to easily compare what's in the filesystem vs what we export
      files: ['src/index.ts'],
      plugins: ['simple-import-sort'],
      rules: {
        'simple-import-sort/exports': 'error',
      },
    },
    {
      // we want explicit function return types for source files, but not for the examples, tests, etc.
      files: ['src/**/!(*.test|*.example|*.doc|*.stories).?(ts|js|tsx|jsx)'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'error',
      },
    },
  ],
};
