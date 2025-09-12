import eslintConfig from '../../templates/skeleton/eslint.config.js';

export default [
  ...eslintConfig,
  {
    ignores: ['public/~partytown/**'],
  },
];