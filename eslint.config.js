// eslint.config.js
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  {
    files: ["**/*.js"],
    env: { node: true, es2021: true },
    rules: {
      semi: "error",
      quotes: ["error", "single"]
    }
    // note: no `extends: ["plugin:..."]`, no plugins field
  }
]);
