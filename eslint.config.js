// eslint.config.js
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  {
    files: ["**/*.js"],     // or adjust according to your project
    rules: {
      "semi": "error",
      "quotes": ["error", "single"],
      // add more rules as needed
    },
    env: {
      node: true,          // if it's server-side node code
      es2021: true,
    },
    // optionally extends popular configs, e.g. "eslint:recommended"
    extends: ["eslint:recommended"],
  },
]);
