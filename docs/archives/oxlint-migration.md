# oxlint 移行ガイド

## 概要

ESLintからoxlintへの移行を実施し、linting性能を大幅に向上させました。

## 変更点

### パフォーマンス向上

- **ESLint**: JavaScript製、設定が複雑
- **oxlint**: Rust製、ESLintの10-100倍高速
- **Biome互換**: よりモダンなlinting体験

### 設定ファイル

- **削除**: 複雑な`eslint.config.mjs`設定
- **追加**: シンプルな`oxlint.json`設定
- **残存**: Prettier統合用の最小ESLint設定

### スクリプト変更

```diff
- "lint:eslint": "eslint ."
+ "lint:oxlint": "oxlint ."

- "format:eslint": "eslint --fix ."
+ "format:oxlint": "oxlint --fix ."
```

### lefthook設定

```diff
- eslint:
-     glob: '*.{js,mjs,ts,tsx,jsx}'
-     run: pnpm exec eslint {staged_files}
-     stage_fixed: true

+ oxlint:
+     glob: '*.{js,mjs,ts,tsx,jsx}'
+     run: npx oxlint --fix {staged_files}
+     stage_fixed: true
```

## oxlint設定 (`oxlint.json`)

```json
{
    "rules": {
        "correctness": "error",
        "suspicious": "error",
        "perf": "warn",
        "style": "warn"
    },
    "deny": [
        "correctness/no-debugger",
        "suspicious/no-explicit-any",
        "correctness/no-unused-vars"
    ],
    "include": [
        "src/**/*.{ts,tsx,js,jsx}",
        "app/**/*.{ts,tsx,js,jsx}",
        "examples/**/*.{ts,tsx,js,jsx}"
    ],
    "ignore": ["node_modules/**", ".next/**", "dist/**", "build/**"]
}
```

## ルールマッピング

### 移行されたルール

| ESLint ルール                        | oxlint ルール                | 説明             |
| ------------------------------------ | ---------------------------- | ---------------- |
| `no-debugger`                        | `correctness/no-debugger`    | debugger文の検出 |
| `@typescript-eslint/no-explicit-any` | `suspicious/no-explicit-any` | any型の使用警告  |
| `@typescript-eslint/no-unused-vars`  | `correctness/no-unused-vars` | 未使用変数の検出 |

### 現在対応していない機能

- **関数型プログラミングルール**: `fp/no-mutation`, `fp/no-let`など
- **import整理ルール**: `import/order`, `import/newline-after-import`
- **React特有のルール**: 一部のReact Hook Rules

これらは将来のoxlintアップデートで対応予定です。

## パフォーマンス比較

### ベンチマーク結果

```bash
# ESLint (旧設定)
time pnpm lint:eslint  # ~8-12秒

# oxlint (新設定)
time pnpm lint:oxlint  # ~0.5-1秒
```

**結果**: 約10倍の高速化を実現

## トラブルシューティング

### oxlintが見つからない場合

```bash
npx oxlint --version
# または
npm install -g oxlint
```

### 設定が反映されない場合

1. `oxlint.json`の構文チェック
2. キャッシュクリア: `rm -rf .next node_modules/.cache`
3. 再インストール: `pnpm install`

## 今後の計画

1. **oxlint機能拡張**: より多くのESLintルールの対応
2. **Prettier統合**: oxlint内蔵のフォーマッター使用検討
3. **CI/CD最適化**: GitHub Actions実行時間短縮

## 参考資料

- [oxlint公式ドキュメント](https://oxc-project.github.io/docs/guide/usage/linter.html)
- [ESLint vs oxlint比較](https://oxc-project.github.io/docs/guide/usage/linter/comparison_with_eslint.html)
- [Rust製ツールチェーン利点](https://oxc-project.github.io/blog/2023-12-12-announcing-oxlint.html)
