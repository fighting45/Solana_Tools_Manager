// eslint.config.js
const { defineConfig } = require("eslint/config");

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
    // ignore frontend and typical build folders
    ignores: ["node_modules/**", "dist/**", "build/**", "frontend/build/**"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "script", // use "module" if your backend uses ESM imports
      },
      globals: {
        // node globals
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
      quotes: ["error", "single"],
    },
  },

  // -------------------------
  // Frontend (frontend folder) - Browser / React (JSX)
  // -------------------------
  {
    files: ["frontend/**/*.{js,jsx}"],
    ignores: ["frontend/node_modules/**", "frontend/build/**"],
    // use Babel parser so JSX and modern syntax parse correctly
    languageOptions: {
      parser: require.resolve("@babel/eslint-parser"),
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
      // The flat config plugin registration is different; plugin linting rules
      // can still be used by name if installed. Keep plugin installed via npm.
    },
    rules: {
      semi: "error",
      quotes: ["error", "single"],
      // add React rules later, e.g., "react/jsx-uses-react": "error" if you enable plugin
    },
  },
]);
