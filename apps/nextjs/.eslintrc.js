module.exports = {
  extends: ['next/core-web-vitals', '../../packages/react/.eslintrc.cjs'],
  rules: {
    // not a big deal if we don't use extensions in the nextjs app
    'import/extensions': ['off'],
  },
};
