module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: ['airbnb-base', 'plugin:compat/recommended'],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        indent: ['error', 4],
        'no-console': 'off',
        'max-len': ['error', { code: 120 }],
        'import/extensions': ['error', 'always'],
        'no-underscore-dangle': { allowAfterThis: true },
    },
    settings: {
        polyfills: ['URLSearchParams', 'Promise', 'fetch'],
    },
};
