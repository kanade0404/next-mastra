# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際にClaude Code (claude.ai/code) へのガイダンスを提供します。

## 言語設定

このプロジェクトでは**日本語**でやりとりを行います。Claude Codeは日本語で応答し、コメントや説明も日本語で記述してください。

## 開発コマンド

- **開発サーバー**: `pnpm dev` (高速ビルドのためTurbopackを使用)
- **ビルド**: `pnpm build`
- **リント**: `pnpm lint` (ESLint、Prettierチェック、CSpellを並列実行)
- **フォーマット**: `pnpm format` (ESLint、Prettier、fixpackの問題を自動修正)

## アーキテクチャ概要

これは厳格なTypeScript設定と包括的なリントを備えたNext.js 15 App Routerプロジェクトです。主要なアーキテクチャ決定:

### API構造

- **ヘッドレスAPI設計**: メインエントリーポイントは `/app/route.ts`、動的スラグルーティングは `/app/[slug]/route.ts`
- **ルートハンドラー**: Next.js App Router APIルート使用 (pages APIではない)

### 技術スタック

- **フレームワーク**: Next.js 15 with App Router
- **認証**: Clerk
- **データベース**: Prisma ORM with Cloudflare D1サポート
- **状態管理**: Zustand + TanStack Query
- **スタイリング**: Tailwind CSS v4
- **バリデーション**: Zodスキーマ
- **エラーハンドリング**: neverthrow（関数型エラーハンドリング）
- **モニタリング**: Sentry + OpenTelemetry
- **メール**: Brevo統合
- **コアフレームワーク**: Mastra (v0.10.5)

### コード品質基準

- **非常に厳格なESLint設定**と関数型プログラミングルール:
    - ミューテーション禁止 (`fp/no-mutation`)
    - `let`宣言禁止 (`fp/no-let`)
    - ループ禁止 (`fp/no-loops`)
    - 明示的な関数戻り値型が必須
    - 追加の安全性チェック付きTypeScript strict mode
- **セキュリティ重視**: CSRF保護、Helmet.js、セキュリティリントルール
- **import整理**: importグループ間の改行が必須

### TypeScript設定

- 追加の安全機能を有効にしたstrictモード:
    - `noUncheckedIndexedAccess`
    - `exactOptionalPropertyTypes`
    - `noImplicitReturns`
    - `noFallthroughCasesInSwitch`

このコードベースで作業する際は、ESLintルールで強制される関数型プログラミングパラダイムに従い、すべての関数に明示的な戻り値型を確実に指定してください。
