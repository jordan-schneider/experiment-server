module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'airbnb-base',
    "plugin:compat/recommended"
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    "indent": ["error", 2],
    "no-console": "off",
  },
  settings: {
    polyfills: [
      "URLSearchParams"
    ]
  }
};
