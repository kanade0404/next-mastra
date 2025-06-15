import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "public/**",
      "coverage/**",
      ".turbo/**",
      "dist/**",
      "build/**",
      ".claude/*.local.json",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      react: pluginReact,
    },
    rules: {
      // 基本的なルール
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",

      // React関連
      "react/react-in-jsx-scope": "off", // Next.js 13+では不要
      "react/jsx-uses-react": "off", // Next.js 13+では不要
      "react/prop-types": "off", // TypeScriptを使用しているため

      // TypeScript関連
    },
    settings: {
      react: {
        version: "detect",
        runtime: "automatic", // Next.js 13+の新しいJSXランタイム
      },
    },
  },
  {
    files: ["**/*.{test,spec}.{ts,tsx,js,jsx}"],
    rules: {
      "no-console": "off", // テストファイルではconsole.logを許可
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...pluginReact.configs.flat.recommended,
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
    },
  },
];
