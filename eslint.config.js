// eslint.config.js
const babelParser = require('@babel/eslint-parser');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');

module.exports = [
  // -------------------------
  // Backend (root) - Node
  // -------------------------
  {
    files: [
      '*.js',
      'app.js',
      'bin/**/*.js',
      'controllers/**/*.js',
      'routes/**/*.js',
      'services/**/*.js',
      'utils/**/*.js',
      'models/**/*.js',
    ],
    ignores: [
      'frontend/**',
      'node_modules/**',
      'dist/**',
      'build/**',
      'frontend/build/**',
    ],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      semi: 'error',
      quotes: ['error', 'single'],
    },
  },

  // -------------------------
  // Frontend (frontend folder) - Browser / React (JSX)
  // -------------------------
  {
    files: ['frontend/**/*.{js,jsx}'],
    ignores: ['frontend/node_modules/**', 'frontend/build/**'],
    languageOptions: {
      parser: babelParser,
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-react'],
        },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      semi: 'error',
      quotes: ['error', 'single'],
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
