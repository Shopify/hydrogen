/**
 * @type {import("@types/eslint").Linter.BaseConfig}
 */
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['react-compiler'],
  rules: {
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/naming-convention': 'off',
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
    'no-useless-escape': 'off',
    'no-case-declarations': 'off',
  },
  overrides: [
    {
      files: '*.tsx',
      rules: {
        'react-compiler/react-compiler': 'error',
      },
    },
  ],
};
