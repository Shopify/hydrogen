export const storefront = {
  extends: [
    './configs/core.js',
    './configs/react.js',
    './configs/remix.js',
    './configs/hydrogen.js',
  ],
  rules: {
    // TODO
    // All rules below this comment should removed and fixed in the codebase
    // --------------------------------------------------------------------
    'tsdoc/syntax': 'off',
    'node/no-missing-import': 'off',
    'node/no-unpublished-import': 'off',
    '@typescript-eslint/no-redeclare': 'off',
    '@typescript-eslint/consistent-type-imports': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
  },
};

export default storefront;
