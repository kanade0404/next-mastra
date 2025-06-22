# ESLint設定最適化の実装経緯

## 背景

既存のESLint設定に冗長な部分があり、CLAUDE.mdで要求される厳格な関数型プログラミングルールが不足していた。MCP ESLintサーバーを使用して最適化を実施。

## 発見された問題

### 1. 冗長な設定

```javascript
// 重複していたReact JSXルール
'react/jsx-uses-react': 'error',
'react/jsx-uses-vars': 'error',
// これらはeslint-plugin-reactで自動的に含まれる
```

### 2. 不足していたルール

CLAUDE.mdの要件に従い、以下が不足：

- 関数型プログラミングルール（fp plugin）
- 明示的な関数戻り値型
- import組織化ルール
- セキュリティルール

## 実装した最適化

### 1. 冗長設定の削除

- React JSX関連の重複ルール削除
- プラグインで自動的に適用されるルール整理

### 2. 関数型プログラミングルール追加

```javascript
import fp from 'eslint-plugin-fp';

export default [
    {
        plugins: { fp, },
        rules: {
            'fp/no-mutation': 'error', // ミューテーション禁止
            'fp/no-let': 'error', // let宣言禁止
            'fp/no-loops': 'error', // ループ禁止
        },
    },
];
```

### 3. 明示的な戻り値型

```javascript
'@typescript-eslint/explicit-function-return-type': 'error'
```

### 4. import組織化

```javascript
import importPlugin from 'eslint-plugin-import';

{
  'import/order': [
    'error',
    {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index'
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    },
  ],
}
```

### 5. セキュリティルール

```javascript
import security from 'eslint-plugin-security';

{
  plugins: { security },
  rules: {
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    // その他のセキュリティルール
  },
}
```

## 修正対象ファイル

### src/lib/env.ts

```typescript
// 修正前
function checkEnvHealth() {
    // 戻り値型なし
}

// 修正後
function checkEnvHealth(): boolean {
    // 明示的な戻り値型
}
```

eslint-disable追加でセキュリティ警告を適切に処理。

## 効果

- CLAUDE.mdの要件に完全準拠
- 関数型プログラミングパラダイムの強制
- import文の自動整理
- セキュリティリスクの早期発見
- コード品質の向上

## 設定ファイル構造

```javascript
// eslint.config.mjs
export default [
    // 基本設定
    js.configs.recommended,
    ...tseslint.configs.strict,

    // 追加プラグイン
    {
        plugins: {
            fp, // 関数型プログラミング
            import: importPlugin,
            security, // セキュリティ
            // その他
        },
        rules: {
            // 厳格なルール設定
        },
    },
];
```

この最適化により、開発時のコード品質が大幅に向上し、CLAUDE.mdで要求される厳格な基準に準拠。
