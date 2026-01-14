/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./react.js'],
  env: {
    'react-native/react-native': true,
  },
  plugins: ['react-native'],
  rules: {
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'off',
  },
};
