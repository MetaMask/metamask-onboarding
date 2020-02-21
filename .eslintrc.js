module.exports = {
  parserOptions: {
    'sourceType': 'module',
    'ecmaVersion': 2017,
  },

  env: {
    'browser': true,
  },

  extends: [
    '@metamask/eslint-config',
  ],

  globals: {
    'web3': true,
  },

  overrides: [{
    files: [
      '.eslintrc.js',
    ],
    parserOptions: {
      sourceType: 'script',
    },
    extends: [
      '@metamask/eslint-config/config/nodejs',
    ],
  }],
}
