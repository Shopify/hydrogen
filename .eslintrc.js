const path = require('path');

const rulesDirPlugin = require('eslint-plugin-rulesdir');

rulesDirPlugin.RULES_DIR = path.join(__dirname, 'eslint-rules');

module.exports = {
  plugins: ['rulesdir'],
  extends: ['plugin:hydrogen/recommended', 'plugin:hydrogen/typescript'],
  rules: {
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/naming-convention': 'off',
    'hydrogen/prefer-image-component': 'off',
    'no-useless-escape': 'off',
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
    'no-case-declarations': 'off',
    // TODO: Remove jest plugin from hydrogen/eslint-plugin
    'jest/no-deprecated-functions': 'off',
    'rulesdir/no-missing-seo': 'warn',
  },
};
