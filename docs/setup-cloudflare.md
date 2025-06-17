# Cloudflare セットアップガイド

Next.js + Mastra Chat LLM テンプレートでCloudflareサービスを設定する詳細手順です。

## 📋 前提条件

- [Cloudflare アカウント](https://cloudflare.com) が作成済み
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) がインストール済み
- `pnpm` または `npm` がインストール済み

## 🚀 クイックセットアップ

### 1. Wrangler認証

```bash
# Cloudflareアカウントにログイン
pnpm wrangler login

# 認証確認
pnpm wrangler whoami
```

### 2. 必要なサービスの作成

以下のコマンドを順番に実行してください：

```bash
# D1データベース作成
pnpm wrangler d1 create next-mastra-chat-db

# R2バケット作成
pnpm wrangler r2 bucket create next-mastra-chat-files

# KVネームスペース作成（キャッシュ用）
pnpm wrangler kv:namespace create "KV_CACHE"

# KVネームスペース作成（ユーザー設定用）
pnpm wrangler kv:namespace create "KV_USER_SETTINGS"

# KVネームスペース作成（セッション用）
pnpm wrangler kv:namespace create "KV_SESSIONS"

# Analytics Engineデータセット作成
pnpm wrangler analytics-engine create next_mastra_chat_analytics
```

### 3. wrangler.tomlの更新

上記コマンドで表示されたIDを`wrangler.toml`の該当箇所に設定してください。

## 📊 詳細セットアップ手順

### Cloudflare D1 データベース

#### 1. データベース作成

```bash
# 本番用データベース
pnpm wrangler d1 create next-mastra-chat-db

# 開発用データベース（オプション）
pnpm wrangler d1 create next-mastra-chat-db-dev
```

#### 2. マイグレーション実行

```bash
# Prismaスキーマからマイグレーション生成
pnpm db:generate

# D1にマイグレーション適用
pnpm wrangler d1 migrations apply next-mastra-chat-db

# 開発DB用（必要に応じて）
pnpm wrangler d1 migrations apply next-mastra-chat-db-dev
```

#### 3. シードデータ投入

```bash
# サンプルデータ投入
pnpm wrangler d1 execute next-mastra-chat-db --file=./prisma/seed.sql
```

### Cloudflare R2 ストレージ

#### 1. バケット作成

```bash
# 本番用バケット
pnpm wrangler r2 bucket create next-mastra-chat-files

# プレビュー用バケット（開発環境）
pnpm wrangler r2 bucket create next-mastra-chat-files-preview

# 開発用バケット
pnpm wrangler r2 bucket create next-mastra-chat-files-dev
```

#### 2. CORS設定

```bash
# CORS設定ファイル作成
cat > cors.json << 'EOF'
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
EOF

# CORS設定適用
pnpm wrangler r2 bucket cors put next-mastra-chat-files --file=cors.json
```

### Cloudflare KV ストレージ

#### 1. 必要なネームスペース作成

```bash
# キャッシュ用（セッション、API レスポンス等）
pnpm wrangler kv:namespace create "KV_CACHE"
pnpm wrangler kv:namespace create "KV_CACHE" --preview

# ユーザー設定用（プリファレンス、設定等）
pnpm wrangler kv:namespace create "KV_USER_SETTINGS"
pnpm wrangler kv:namespace create "KV_USER_SETTINGS" --preview

# セッション用（認証セッション等）
pnpm wrangler kv:namespace create "KV_SESSIONS"
pnpm wrangler kv:namespace create "KV_SESSIONS" --preview
```

#### 2. 設定例

```bash
# 設定値のセット例
pnpm wrangler kv:key put --binding=KV_CACHE "app:config" '{"version":"1.0.0","features":["chat","rag"]}'

# 値の確認
pnpm wrangler kv:key get --binding=KV_CACHE "app:config"
```

### Cloudflare Analytics Engine

#### 1. データセット作成

```bash
# メインのAnalytics Engineデータセット
pnpm wrangler analytics-engine create next_mastra_chat_analytics
```

#### 2. カスタムメトリクス設定

Analytics Engineで追跡するメトリクス例：

- **チャット使用量**: `chat_messages_sent`, `chat_response_time`
- **RAG機能**: `rag_queries_count`, `embedding_generation_time`
- **ユーザー行動**: `user_login_count`, `session_duration`
- **エラー率**: `error_rate`, `api_error_count`

## 🔧 環境変数設定

### 1. シークレット設定

```bash
# OpenAI API Key
pnpm wrangler secret put OPENAI_API_KEY

# Clerk認証キー
pnpm wrangler secret put CLERK_SECRET_KEY

# Pinecone API Key
pnpm wrangler secret put PINECONE_API_KEY

# Brevo メールサービス
pnpm wrangler secret put BREVO_API_KEY

# Sentry エラー監視
pnpm wrangler secret put SENTRY_DSN

# Grafana Cloud 監視
pnpm wrangler secret put GRAFANA_CLOUD_API_KEY

# セキュリティキー
pnpm wrangler secret put CSRF_SECRET
pnpm wrangler secret put ENCRYPTION_KEY
```

### 2. 環境変数の確認

```bash
# 設定済みシークレット一覧
pnpm wrangler secret list

# 特定のシークレット削除（必要に応じて）
pnpm wrangler secret delete SECRET_NAME
```

## 🚦 デプロイと動作確認

### 1. 開発環境でのテスト

```bash
# ローカル開発サーバー起動（Cloudflare Workers環境シミュレート）
pnpm wrangler pages dev

# または通常のNext.js開発サーバー
pnpm dev
```

### 2. プレビューデプロイ

```bash
# プレビュー環境へデプロイ
pnpm wrangler pages deploy

# 特定ブランチのデプロイ
pnpm wrangler pages deploy --branch=feature-branch
```

### 3. 本番デプロイ

```bash
# 本番環境へデプロイ
pnpm deploy

# デプロイ状況確認
pnpm wrangler pages deployment list
```

## 🔍 トラブルシューティング

### よくある問題と解決法

#### 1. D1データベース接続エラー

```bash
# データベース一覧確認
pnpm wrangler d1 list

# 接続テスト
pnpm wrangler d1 execute your-db-name --command="SELECT 1"
```

#### 2. R2バケットアクセスエラー

```bash
# バケット一覧確認
pnpm wrangler r2 bucket list

# バケット情報確認
pnpm wrangler r2 bucket info next-mastra-chat-files
```

#### 3. KV アクセスエラー

```bash
# ネームスペース一覧確認
pnpm wrangler kv:namespace list

# キー一覧確認
pnpm wrangler kv:key list --binding=KV_CACHE
```

#### 4. Analytics Engine エラー

```bash
# データセット一覧確認
pnpm wrangler analytics-engine list
```

### ログ確認

```bash
# リアルタイムログ確認
pnpm wrangler pages deployment tail

# エラーログのみ表示
pnpm wrangler pages deployment tail --format=pretty --level=error
```

## 📈 パフォーマンス最適化

### 1. キャッシュ戦略

- **静的アセット**: 1年間のブラウザキャッシュ
- **API レスポンス**: 5分間のエッジキャッシュ
- **ユーザーデータ**: KVストレージで高速アクセス

### 2. リソース制限の最適化

- **CPU時間**: 30秒以内で処理完了
- **メモリ**: 128MB以内で効率的な使用
- **リクエストサイズ**: 25MB以内でファイルアップロード

### 3. コスト最適化

- **D1**: 1日あたり100,000回読み取り、50,000回書き込みまで無料
- **R2**: 月10GBストレージ、100万リクエストまで無料
- **KV**: 1日あたり100,000読み取り、1,000書き込みまで無料
- **Analytics Engine**: 月10万イベントまで無料

## 🔗 関連リンク

- [Cloudflare Pages ドキュメント](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 ドキュメント](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 ドキュメント](https://developers.cloudflare.com/r2/)
- [Cloudflare KV ドキュメント](https://developers.cloudflare.com/workers/wrangler/workers-kv/)
- [Cloudflare Analytics Engine ドキュメント](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Wrangler CLI リファレンス](https://developers.cloudflare.com/workers/wrangler/)

## 💡 ヒント

1. **段階的セットアップ**: 一度に全てを設定せず、必要なサービスから順次設定
2. **環境分離**: 開発・ステージング・本番環境で異なるリソースを使用
3. **モニタリング**: Analytics EngineとGrafana Cloudで運用状況を監視
4. **バックアップ**: D1データベースの定期バックアップを設定
5. **セキュリティ**: APIキーは必ずsecretsで管理、環境変数には含めない
