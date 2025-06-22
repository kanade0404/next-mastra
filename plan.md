# Next.js + Mastra Chat LLM アプリ開発計画

## プロジェクト概要

ChatGPTのようなチャット形式のLLMアプリケーションを構築し、各ライブラリのセットアップ済み状態を示すテンプレートリポジトリを作成する。MCP (Model Context Protocol) サーバーを活用してAIエージェントの機能を拡張し、開発効率を最大化する。

## 使用ライブラリとその役割

### コアフレームワーク

- **Next.js 15 (App Router)**: メインフレームワーク
- **Mastra v0.10.5**: LLM統合・AIワークフロー管理
- **React 19**: UI構築

### 認証・ユーザー管理

- **Clerk**: 認証システム（ログイン/サインアップ/プロファイル）
- **jose**: JWT処理

### データベース・ORM

- **Prisma**: ORM
- **Cloudflare D1**: SQLiteベースのサーバーレスDB

### 状態管理・データフェッチング

- **TanStack Query**: サーバー状態管理・キャッシュ
- **Zustand**: クライアント状態管理
- **superjson**: シリアライゼーション

### バリデーション・エラーハンドリング

- **Zod**: スキーマバリデーション
- **neverthrow**: 関数型エラーハンドリング

### UI・スタイリング

- **Tailwind CSS v4**: スタイリング
- **clsx**: 条件付きクラス名

### 通信・メール

- **Brevo**: メール送信（新規登録通知、使用量アラート等）

### セキュリティ

- **helmet**: セキュリティヘッダー
- **csurf**: CSRF保護

### 監視・ログ

- **Sentry**: エラートラッキング
- **OpenTelemetry**: 可観測性
- **pino**: 構造化ログ

### MCP (Model Context Protocol) サーバー

- **Filesystem server**: セキュアなファイル操作
- **Fetch server**: Web コンテンツ取得・変換
- **Database servers**: PostgreSQL/ClickHouse 連携（Aiven/ClickHouse）
- **Testing server**: AI管理エンドツーエンドテスト（Debugg.AI）

## 実装フェーズ

### フェーズ1: 基盤設定（優先度最高）

1. **MCP サーバー設定**

   - Filesystem server: ファイル操作機能
   - Fetch server: Web コンテンツ取得
   - 開発環境での MCP 統合設定

2. **lefthook 設定**

   - pre-commit フック（ESLint、Prettier、secretlint、cspell）
   - pre-push フック（型チェック、テスト）
   - 自動フォーマット・品質チェック

3. **環境変数設定**

   - Clerk認証キー
   - OpenAI APIキー
   - Cloudflare D1設定
   - Brevo APIキー
   - Sentry DSN

4. **データベーススキーマ設計**

   ```prisma
   model User {
     id            String   @id @default(cuid())
     clerkId       String   @unique
     email         String   @unique
     conversations Conversation[]
     createdAt     DateTime @default(now())
   }

   model Conversation {
     id        String    @id @default(cuid())
     userId    String
     title     String
     user      User      @relation(fields: [userId], references: [id])
     messages  Message[]
     createdAt DateTime  @default(now())
   }

   model Message {
     id             String       @id @default(cuid())
     conversationId String
     role           String       // "user" | "assistant"
     content        String
     conversation   Conversation @relation(fields: [conversationId], references: [id])
     createdAt      DateTime     @default(now())
   }
   ```

5. **Clerk設定**
   - ミドルウェアでルート保護
   - ユーザープロファイルページ
   - サインイン/サインアップページ

### フェーズ2: チャット機能

1. **チャットUI構築**

   - メッセージ一覧表示
   - メッセージ入力フォーム
   - 会話履歴サイドバー
   - ストリーミングレスポンス表示

2. **Mastra LLM統合**

   - OpenAI GPT-4統合
   - ストリーミングAPI実装
   - プロンプトテンプレート管理

3. **API エンドポイント（/api/v1 から開始）**
   - `POST /api/v1/chat` - メッセージ送信
   - `GET /api/v1/conversations` - 会話一覧
   - `POST /api/v1/conversations` - 新規会話作成
   - `DELETE /api/v1/conversations/[id]` - 会話削除

### フェーズ3: 状態管理・最適化

1. **Zustand ストア**

   - チャット状態管理
   - UI状態管理

2. **TanStack Query**

   - 会話データキャッシュ
   - リアルタイム更新
   - 楽観的更新

3. **Zod バリデーション**
   - API入力バリデーション
   - フォームバリデーション

### フェーズ4: 通知・監視

1. **Brevo メール統合**

   - 新規登録ウェルカムメール
   - 使用量上限通知
   - メール送信例のAPI実装

2. **Sentry エラー監視**

   - フロントエンド・バックエンドエラー監視
   - パフォーマンス監視設定

3. **OpenTelemetry**
   - トレーシング設定
   - メトリクス収集

### フェーズ5: セキュリティ・最終調整

1. **セキュリティ強化**

   - CSRF保護実装
   - セキュリティヘッダー設定
   - レート制限

2. **ログシステム**

   - 構造化ログ実装
   - ログレベル設定

3. **ドキュメント整備**
   - README更新
   - 各ライブラリの使用例説明
   - 環境変数設定ガイド

## ディレクトリ構成

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/
│   │   ├── chat/
│   │   └── profile/
│   ├── api/
│   │   └── v1/
│   │       ├── chat/
│   │       ├── conversations/
│   │       └── webhooks/
│   └── globals.css
├── components/
│   ├── chat/
│   ├── ui/
│   └── layout/
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── mastra.ts
│   ├── email.ts
│   ├── mcp/
│   │   ├── filesystem.ts
│   │   └── fetch.ts
│   └── utils.ts
├── stores/
│   └── chat.ts
└── types/
    └── index.ts
```

## 完成時の機能

### ユーザー機能

- Clerkによる認証
- チャット会話
- 会話履歴管理
- プロファイル管理

### 管理機能

- エラー監視（Sentry）
- ログ出力（Pino）
- メール通知（Brevo）
- パフォーマンス監視（OpenTelemetry）

### 開発者向け

- 厳格なTypeScript設定
- 関数型プログラミング規約
- 包括的なリント設定
- lefthook による自動品質チェック
- MCP サーバー統合によるAI開発支援
- 各ライブラリの実用的な使用例

## 重要な設計決定

### MCP サーバー優先採用理由

1. **開発効率**: AIエージェントがファイル操作、Web取得を直接実行
2. **品質向上**: AI管理テストによる自動品質保証
3. **拡張性**: 将来的なAI機能追加の基盤

### lefthook 早期導入理由

1. **品質ガードレール**: コミット前の自動チェック
2. **開発体験**: 自動フォーマット・修正
3. **継続的品質**: 厳格なルール適用の自動化

### API バージョニング理由

1. **後方互換性**: 段階的なAPI進化
2. **明確性**: エンドポイントの世代管理
3. **保守性**: 複数バージョン並行サポート

このテンプレートをクローンすることで、即座にLLMアプリケーション開発を開始できる状態を目指します。
