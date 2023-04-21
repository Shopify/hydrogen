module.exports = {
  extends: [
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  plugins: ['react', 'react-hooks', 'jsx-a11y'],
  env: {
    browser: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    // React is not required to be in scope
    'react/react-in-jsx-scope': 'off',
    // This rule has a lot of falsy positives, and we prefer function declarations anyways
    'react/display-name': 'off',
    // Let TypeScript take care of this, otherwise users can enable it themselves
    'react/prop-types': 'off',
    // We prefer to use index as a key when appropriate, but a warning is fine
    'react/no-array-index-key': 'warn',
  },
};

export {};
