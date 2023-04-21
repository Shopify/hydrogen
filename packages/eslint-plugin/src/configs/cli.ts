export const cli = {
  extends: [
    './configs/core.js' /** TODO use the shopify CLI configs 'plugin:@shopify/cli/configs' */,
  ],
  env: {
    node: true,
  },
  rules: {
    // TODO
    // All rules below this comment should removed and fixed in the codebase
    // --------------------------------------------------------------------
    'no-process-exit': 'off',
    'node/shebang': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};

export default cli;
