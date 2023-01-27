module.exports = {
  extends: [
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
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
  ],
};
