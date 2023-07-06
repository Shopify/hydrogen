/**
 * @type {import("@types/eslint").Linter.BaseConfig}
 */
module.exports = {
  parser: '@typescript-eslint/parser',
  rules: {
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/naming-convention': 'off',
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
    'no-useless-escape': 'off',
    'no-case-declarations': 'off',
  },
  overrides: [
    {
      files: ['./examples/tokengated-storefront/*', './templates/demo-store/*'],
      rules: {
        'import/order': [
          'error',
          {
            /**
             * @description
             *
             * This keeps imports separate from one another, ensuring that imports are separated
             * by their relative groups. As you move through the groups, imports become closer
             * to the current file.
             *
             * @example
             * ```
             * import fs from 'fs';
             *
             * import package from 'npm-package';
             *
             * import xyz from '~/project-file';
             *
             * import index from '../';
             *
             * import sibling from './foo';
             * ```
             */
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
            'newlines-between': 'always',
          },
        ],
      },
    },
  ],
};
