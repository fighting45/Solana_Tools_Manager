// eslint.config.js
const { defineConfig } = require("eslint/config");
const babelParser = require("@babel/eslint-parser");

module.exports = defineConfig([
  // -------------------------
  // Backend (root) - Node
  // -------------------------
  {
    files: [
      "*.js",
      "app.js",
      "bin/**/*.js",
      "controllers/**/*.js",
      "routes/**/*.js",
      "services/**/*.js",
      "utils/**/*.js",
      "controllers/**/*.js",
      "models/**/*.js",
    ],
    ignores: [
      "frontend/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "frontend/build/**",
    ],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "script", // use "module" if your backend uses ESM imports
      },
      globals: {
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        exports: "readonly",
        require: "readonly",
      },
    },
    rules: {
      semi: "error",
      // quotes: ["error", "single"],
    },
  },

  // -------------------------
  // Frontend (frontend folder) - Browser / React (JSX)
  // -------------------------
  {
    files: ["frontend/**/*.{js,jsx}"],
    ignores: ["frontend/node_modules/**", "frontend/build/**"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        // allow @babel/eslint-parser to run without a babel config file:
        requireConfigFile: false,
        babelOptions: {
          presets: ["@babel/preset-react"],
        },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
      },
    },
    plugins: {
      // Keep plugin installed via npm if you plan to use React or other rules
    },
    rules: {
      semi: "error",
      quotes: ["error", "single"],
      // add React rules later, e.g. if you enable plugin
    },
  },
]);
