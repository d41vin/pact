// eslint.config.js
import tsParser from "@typescript-eslint/parser";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";

export default [
  // Apply to all TypeScript files
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin
    },
    rules: {
      // Basic TS rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "warn"
    }
  }
  // Optionally, add JSON, JS, or other file types if needed
];
