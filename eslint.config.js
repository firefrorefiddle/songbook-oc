import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.js";
import globals from "globals";

export default ts.config(
  js.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        parseForESLint: svelteConfig.preprocess,
      },
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
  },
  {
    rules: {
      "svelte/no-at-html-tags": "off",
      "svelte/require-each-key": "off",
      "svelte/no-navigation-without-resolve": "off",
      "svelte/no-useless-children-snippet": "off",
      "svelte/prefer-svelte-reactivity": "off",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules",
      "build",
      ".svelte-kit",
      "package",
      "pnpm-lock.yaml",
    ],
  },
);
