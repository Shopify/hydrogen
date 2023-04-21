module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:eslint-comments/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['eslint-comments', 'eslint-plugin-tsdoc', 'prettier'],
  env: {
    es2021: true,
  },
  parserOptions: {
    sourceType: 'module',
  },
  rules: {
    'no-console': 'warn',
    // Intentionally disabled, we use switch statements sometimes
    // and don't want to force people to use if/else
    'no-case-declarations': 'off',

    'eslint-comments/no-unused-disable': 'error',
    'object-shorthand': ['error', 'always', {avoidQuotes: true}],

    // TODO
    // All rules below this comment should be removed and fixed in the codebase
    // --------------------------------------------------------------------
    // we can't use engine, so we need to use the node version
    // we allow import/export syntax because typescript supports it
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-unsupported-features/es-builtins': 'off',
    'node/no-unsupported-features/node-builtins': 'off',
    'node/no-missing-import': 'off',
    'node/no-extraneous-import': 'off',
    'import/no-unresolved': 'off',
    'node/no-unpublished-import': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    '**/storefront-api-types.d.ts',
    '**/dist/**',
    '**/coverage/**',
    '**/docs/**',
    '**/tsup.config.ts',
    '**/.eslintrc.cjs',
    '**/src/*.example.tsx',
    '**/src/*.example.ts',
    '**/src/*.example.jsx',
    '**/src/*.example.js',
    '*.graphql.d.ts',
    '*.graphql.ts',
  ],

  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {
        // We use tsdoc for documentation when possible, but we don't
        // need to break the build if it's missing or there are problems.
        'tsdoc/syntax': 'warn',
        // Don't hate.
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-non-null-assertion': 'warn',
      },
    },
  ],
};

export {};
