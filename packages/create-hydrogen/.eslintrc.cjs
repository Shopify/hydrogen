/**
 * @type {import("@types/eslint").Linter.BaseConfig}
 */
module.exports = {
  root: true,
  extends: ['plugin:h2/cli'],
  parserOptions: {
    project: './tsconfig.json',
  },
  ignorePatterns: ['virtual-routes/'],
};
