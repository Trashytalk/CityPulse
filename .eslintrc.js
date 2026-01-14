// @ts-check
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@citypulse/eslint-config'],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.next/',
    '.turbo/',
    'coverage/',
  ],
};
