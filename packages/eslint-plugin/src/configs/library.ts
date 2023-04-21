export const library = {
  extends: [
    './configs/core.js',
    './configs/react.js',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  rules: {
    // ensure that file extensions are used from now on
    // and turn off rules that conflict between TS requiring .js extensions
    // and those .js files not actually existing in the filesystem
    'import/extensions': ['error', 'ignorePackages'],
    'import/no-unresolved': 'off',
    'node/no-missing-import': 'off',
    // we can allow these imports in the library
    'node/no-extraneous-import': [
      'error',
      {
        allowModules: ['@shopify/hydrogen'],
      },
    ],
    'node/no-extraneous-require': [
      'error',
      {
        allowModules: ['@shopify/hydrogen'],
      },
    ],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {
        // We use tsdoc for documentation when possible
        'tsdoc/syntax': 'error',
        // Activate Frehner mode
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
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

export default library;
