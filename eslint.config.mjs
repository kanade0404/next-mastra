import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import nextPlugin from "@next/eslint-plugin-next";
import tailwindcssPlugin from "eslint-plugin-tailwindcss";
import prettierPlugin from "eslint-plugin-prettier";
import eslintCommentsPlugin from "eslint-plugin-eslint-comments";
import storybookPlugin from "eslint-plugin-storybook";
import testingLibraryPlugin from "eslint-plugin-testing-library";
import securityPlugin from "eslint-plugin-security";
import sonarjsPlugin from "eslint-plugin-sonarjs";
import promisePlugin from "eslint-plugin-promise";
import unicornPlugin from "eslint-plugin-unicorn";
import fpPlugin from "eslint-plugin-fp";
import zodPlugin from "eslint-plugin-zod";
import depcheckPlugin from "eslint-plugin-depcheck";
import vitestPlugin from "eslint-plugin-vitest";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: {
      js,
      // 型安全: TypeScript の厳格ルール
      "@typescript-eslint": tsPlugin,
      // React/JSX
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      // アクセシビリティ
      "jsx-a11y": jsxA11yPlugin,
      // Next.js
      "@next": nextPlugin,
      // import 解決
      import: importPlugin,
      // Tailwind クラス検証
      tailwindcss: tailwindcssPlugin,
      // コメントによるバイパス禁止
      "eslint-comments": eslintCommentsPlugin,
      // Storybook
      storybook: storybookPlugin,
      // Testing Library
      "testing-library": testingLibraryPlugin,
      // セキュリティ
      security: securityPlugin,
      // コード品質
      sonarjs: sonarjsPlugin,
      promise: promisePlugin,
      unicorn: unicornPlugin,
      // 関数型指向
      fp: fpPlugin,
      // zod misuse
      zod: zodPlugin,
      // depcheck
      depcheck: depcheckPlugin,
      // Prettier 連携
      prettier: prettierPlugin,
      vitest: vitestPlugin,
    },
    extends: ["js/recommended", "plugin:vitest/recommended"],
    rules: {
      rules: {
        /** ── TypeScript 型安全 ───────────────────────── */
        "@typescript-eslint/no-explicit-any": "error", // 暗黙 any → NG
        "@typescript-eslint/no-unsafe-assignment": "error", // any→変数代入 → NG
        "@typescript-eslint/no-unsafe-member-access": "error", // any.foo → NG
        "@typescript-eslint/no-unsafe-call": "error", // any() → NG
        "@typescript-eslint/no-unsafe-return": "error", // any 戻り値 → NG
        "@typescript-eslint/no-non-null-assertion": "error", // foo! → NG
        "@typescript-eslint/explicit-function-return-type": [
          "error",
          { allowExpressions: false },
        ],
        "@typescript-eslint/strict-boolean-expressions": "error",

        /** ── コメントバイパス禁止 ─────────────────────── */
        "eslint-comments/no-unused-disable": "error", // 無駄な disable → NG
        "eslint-comments/no-use": [
          "error",
          { allow: ["eslint-disable-next-line"] },
        ],
        "eslint-comments/no-restricted-disable": [
          "error",
          { terms: ["@ts-ignore", "@ts-expect-error"] },
        ],

        /** ── セキュリティチェック ─────────────────────── */
        "security/detect-object-injection": "error",
        "sonarjs/cognitive-complexity": ["error", 15],
        "unicorn/no-abusive-eslint-disable": "error",

        /** ── Promise / 副作用制御 ───────────────────── */
        "@typescript-eslint/no-floating-promises": "error", // await 忘れ → NG
        "fp/no-mutation": "error", // ミューテート禁止
        "fp/no-let": "error", // let 禁止
        "fp/no-loops": "error", // ループ禁止

        /** ── その他厳格チェック ─────────────────────── */
        "no-console": ["error", { allow: ["warn", "error"] }],
        "no-debugger": "error",
        "import/order": ["error", { "newlines-between": "always" }],
        "prettier/prettier": "error", // Prettier と整合しない → エラー
      },
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": { typescript: {} },
      tailwindcss: { config: "tailwind.config.js", ignore: ["dark"] },
    },
  },
  {
    files: ["**/*.{test,spec}.{ts,tsx,js,jsx}"],
    extends: ["plugin:vitest/recommended"],
    rules: {
      // 例: テスト内の console.log を許可する
      "no-console": ["warn", { allow: ["warn", "error", "log"] }],
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
]);
