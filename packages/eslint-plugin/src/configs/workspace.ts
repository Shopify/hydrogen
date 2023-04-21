export const workspace = {
  extends: ['./configs/core.js', 'prettier'],
  env: {
    node: true,
  },
  rules: {
    // '@typescript-eslint/ban-ts-comment': 'off',
    // '@typescript-eslint/naming-convention': 'off',
    // '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
    // 'no-useless-escape': 'off',
    // 'no-case-declarations': 'off',
    // We can allow this in the workspace
    'no-console': 'off',
  },
};

export default workspace;
