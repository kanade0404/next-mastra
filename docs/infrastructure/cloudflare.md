# Cloudflare インフラストラクチャ仕様書

## 概要

Cloudflare エコシステムを最大限活用し、コスト効率的で高性能なサーバーレスアーキテクチャを構築。Pages + Functions でのホスティング、D1 データベース、R2 ストレージ、KV キャッシュ、Analytics Engine による包括的なインフラ統合。

## アーキテクチャ概要

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cloudflare    │    │   Cloudflare     │    │   Cloudflare    │
│     Pages       │────│    Functions     │────│      D1         │
│  (Static Site)  │    │ (API Routes)     │    │  (Database)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │              ┌─────────────────┐                │
         │              │   Cloudflare    │                │
         └──────────────│       KV        │────────────────┘
                        │   (Cache)       │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │   Cloudflare    │
                        │       R2        │
                        │  (File Storage) │
                        └─────────────────┘
```

## Cloudflare Pages

### 設定概要

- **フレームワーク**: Next.js 15 (@cloudflare/next-on-pages)
- **ビルドコマンド**: `pnpm build:cf`
- **出力ディレクトリ**: `.next`
- **環境変数**: 本番・プレビュー環境別設定

### デプロイ設定

```toml
# wrangler.toml
name = "next-mastra-chat"
compatibility_date = "2024-12-15"

[env.production]
name = "next-mastra-chat"

[env.preview]
name = "next-mastra-chat-preview"
```

### ビルド最適化

```typescript
// next.config.ts
import { setupDevPlatform, } from '@cloudflare/next-on-pages/next-dev';

const nextConfig = {
    experimental: {
        runtime: 'edge',
    },
    images: {
        unoptimized: true, // Cloudflare Images 使用時
    },
    // Cloudflare 最適化
    trailingSlash: false,
    poweredByHeader: false,
    compress: true,
};

if (process.env.NODE_ENV === 'development') {
    await setupDevPlatform();
}

export default nextConfig;
```

### 環境変数管理

```bash
# 本番環境
wrangler pages secret put OPENAI_API_KEY
wrangler pages secret put CLERK_SECRET_KEY
wrangler pages secret put PINECONE_API_KEY
wrangler pages secret put BREVO_API_KEY

# プレビュー環境
wrangler pages secret put OPENAI_API_KEY --env preview
```

## Cloudflare Functions

### API ルート設定

```typescript
// functions/api/v1/[[...route]].ts
export async function onRequest(context: EventContext<Env, string, {}>,) {
    const { request, env, params, } = context;

    // Next.js API ルートの処理
    return await handleRequest(request, env, params,);
}

interface Env {
    // Database
    DB: D1Database;

    // Storage
    R2_BUCKET: R2Bucket;

    // Cache
    KV_CACHE: KVNamespace;
    KV_SESSIONS: KVNamespace;

    // Analytics
    ANALYTICS_ENGINE: AnalyticsEngineDataset;

    // Secrets
    OPENAI_API_KEY: string;
    PINECONE_API_KEY: string;
    CLERK_SECRET_KEY: string;
    BREVO_API_KEY: string;
}
```

### ランタイム制限対応

- **メモリ制限**: 128MB (default)
- **実行時間**: 30秒 (CPU time)
- **リクエストサイズ**: 100MB
- **レスポンスサイズ**: 25MB

```typescript
// 大容量処理の分割実装例
async function processLargeDocument(file: File, env: Env,): Promise<void> {
    const chunks = await splitDocumentIntoChunks(file, {
        maxSize: 1024 * 1024,
    },); // 1MB chunks

    for (const chunk of chunks) {
        // 各チャンクを個別のリクエストで処理
        await processChunk(chunk, env,);

        // CPU時間制限を回避するための待機
        await new Promise((resolve,) => setTimeout(resolve, 100,));
    }
}
```

## Cloudflare D1

### データベース設定

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "next-mastra-chat"
database_id = "your-database-id"

[env.preview.d1_databases]
binding = "DB"
database_name = "next-mastra-chat-preview"
database_id = "your-preview-database-id"
```

### 接続・クエリ最適化

```typescript
// src/lib/db/d1.ts
interface D1Client {
    query<T = any,>(sql: string, params?: any[],): Promise<D1Result<T>>;
    batch<T = any,>(statements: D1PreparedStatement[],): Promise<D1Result<T>[]>;
    prepare(sql: string,): D1PreparedStatement;
    dump(): Promise<ArrayBuffer>;
    exec(sql: string,): Promise<D1ExecResult>;
}

class DatabaseManager {
    constructor(private db: D1Database,) {}

    // トランザクション処理
    async transaction<T,>(queries: () => Promise<T>,): Promise<T> {
        const statements: D1PreparedStatement[] = [];

        try {
            const result = await queries();
            if (statements.length > 0) {
                await this.db.batch(statements,);
            }
            return result;
        } catch (error) {
            // D1 は自動ロールバック
            throw error;
        }
    }

    // バッチ挿入最適化
    async batchInsert<T,>(table: string, records: T[],): Promise<void> {
        const batchSize = 100; // D1 バッチ制限考慮

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize,);
            const statements = batch.map((record,) =>
                this.prepareBatchInsertStatement(table, record,)
            );

            await this.db.batch(statements,);
        }
    }
}
```

### スキーマ管理

```sql
-- migrations/001_initial_schema.sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);

-- Full-Text Search 設定
CREATE VIRTUAL TABLE messages_fts USING fts5(
  content,
  content='messages',
  content_rowid='id'
);

-- FTS トリガー設定
CREATE TRIGGER messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
END;
```

### マイグレーション管理

```bash
# マイグレーション作成
wrangler d1 migrations create next-mastra-chat "add_documents_table"

# マイグレーション適用
wrangler d1 migrations apply next-mastra-chat --local
wrangler d1 migrations apply next-mastra-chat --remote
```

## Cloudflare R2

### バケット設定

```toml
# wrangler.toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "next-mastra-files"

[env.preview.r2_buckets]
binding = "R2_BUCKET"
bucket_name = "next-mastra-files-preview"
```

### ファイル操作実装

```typescript
// src/lib/storage/r2.ts
class R2FileManager {
    constructor(private bucket: R2Bucket,) {}

    async uploadFile(
        key: string,
        file: File | ArrayBuffer,
        metadata?: Record<string, string>,
    ): Promise<void> {
        await this.bucket.put(key, file, {
            httpMetadata: {
                contentType: file instanceof File
                    ? file.type
                    : 'application/octet-stream',
                cacheControl: 'public, max-age=31536000', // 1年キャッシュ
            },
            customMetadata: metadata,
        },);
    }

    async getFile(key: string,): Promise<R2ObjectBody | null> {
        return await this.bucket.get(key,);
    }

    async deleteFile(key: string,): Promise<void> {
        await this.bucket.delete(key,);
    }

    async listFiles(prefix?: string, limit = 1000,): Promise<R2Objects> {
        return await this.bucket.list({
            prefix,
            limit,
        },);
    }

    // プリサインドURL生成（将来実装）
    async generatePresignedUrl(
        key: string,
        expiresIn = 3600,
    ): Promise<string> {
        // R2 API でのプリサインドURL生成
        // 現在は直接アクセスURLを返す
        return `https://your-domain.com/api/v1/files/${key}`;
    }
}
```

### ファイル管理戦略

```typescript
// ファイル命名規則
interface FileNamingStrategy {
    generateKey(
        userId: string,
        fileType: 'document' | 'avatar' | 'temp',
        originalName: string,
    ): string;
}

class FileKeyGenerator implements FileNamingStrategy {
    generateKey(
        userId: string,
        fileType: string,
        originalName: string,
    ): string {
        const timestamp = Date.now();
        const sanitizedName = this.sanitizeFileName(originalName,);
        const extension = this.getFileExtension(originalName,);

        return `${fileType}/${userId}/${timestamp}-${sanitizedName}.${extension}`;
    }

    private sanitizeFileName(name: string,): string {
        return name
            .replace(/[^a-zA-Z0-9.-]/g, '_',)
            .replace(/_{2,}/g, '_',)
            .substring(0, 100,);
    }
}
```

## Cloudflare KV

### 名前空間設定

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "KV_CACHE"
id = "your-cache-namespace-id"

[[kv_namespaces]]
binding = "KV_SESSIONS"
id = "your-sessions-namespace-id"

[env.preview.kv_namespaces]
binding = "KV_CACHE"
id = "your-preview-cache-namespace-id"
```

### キャッシュ実装

```typescript
// src/lib/cache/kv.ts
class KVCacheManager {
    constructor(private kv: KVNamespace,) {}

    async get<T,>(key: string,): Promise<T | null> {
        const value = await this.kv.get(key, { type: 'json', },);
        return value as T | null;
    }

    async set<T,>(
        key: string,
        value: T,
        options?: { ttl?: number; expirationTtl?: number; },
    ): Promise<void> {
        await this.kv.put(key, JSON.stringify(value,), {
            expirationTtl: options?.ttl || options?.expirationTtl || 3600, // 1時間デフォルト
        },);
    }

    async delete(key: string,): Promise<void> {
        await this.kv.delete(key,);
    }

    async list(
        prefix?: string,
    ): Promise<KVNamespaceListResult<unknown, string>> {
        return await this.kv.list({ prefix, },);
    }

    // パターンベースキャッシュ
    async cacheWithPattern<T,>(
        pattern: string,
        generator: () => Promise<T>,
        ttl = 3600,
    ): Promise<T> {
        const cached = await this.get<T>(pattern,);
        if (cached !== null) {
            return cached;
        }

        const fresh = await generator();
        await this.set(pattern, fresh, { ttl, },);
        return fresh;
    }
}
```

### セッション管理

```typescript
// セッション情報のKV保存
interface SessionData {
    userId: string;
    clerkSessionId: string;
    deviceInfo: DeviceInfo;
    lastActivityAt: string;
    preferences: UserPreferences;
}

class SessionManager {
    constructor(private kv: KVNamespace,) {}

    async storeSession(sessionId: string, data: SessionData,): Promise<void> {
        await this.kv.put(
            `session:${sessionId}`,
            JSON.stringify(data,),
            { expirationTtl: 86400, }, // 24時間
        );
    }

    async getSession(sessionId: string,): Promise<SessionData | null> {
        const data = await this.kv.get(`session:${sessionId}`, {
            type: 'json',
        },);
        return data as SessionData | null;
    }

    async invalidateSession(sessionId: string,): Promise<void> {
        await this.kv.delete(`session:${sessionId}`,);
    }

    async refreshSession(sessionId: string,): Promise<void> {
        const session = await this.getSession(sessionId,);
        if (session) {
            session.lastActivityAt = new Date().toISOString();
            await this.storeSession(sessionId, session,);
        }
    }
}
```

## Analytics Engine

### メトリクス設定

```toml
# wrangler.toml
[[analytics_engine_datasets]]
binding = "ANALYTICS_ENGINE"
```

### メトリクス収集実装

```typescript
// src/lib/analytics/metrics.ts
interface MetricEvent {
    timestamp: number;
    blobs: string[];
    doubles: number[];
    indexes: string[];
}

class MetricsCollector {
    constructor(private analytics: AnalyticsEngineDataset,) {}

    async trackChatMessage(data: {
        userId: string;
        conversationId: string;
        messageLength: number;
        responseTime: number;
        model: string;
        hasRAG: boolean;
    },): Promise<void> {
        await this.analytics.writeDataPoint({
            timestamp: Date.now(),
            blobs: [
                data.userId,
                data.conversationId,
                data.model,
                data.hasRAG ? 'rag' : 'normal',
            ],
            doubles: [data.messageLength, data.responseTime,],
            indexes: ['chat_message',],
        },);
    }

    async trackSearchQuery(data: {
        userId: string;
        query: string;
        resultCount: number;
        searchTime: number;
        searchType: 'semantic' | 'keyword' | 'hybrid';
    },): Promise<void> {
        await this.analytics.writeDataPoint({
            timestamp: Date.now(),
            blobs: [
                data.userId,
                data.searchType,
                this.hashQuery(data.query,), // プライバシー考慮
            ],
            doubles: [data.resultCount, data.searchTime,],
            indexes: ['search_query',],
        },);
    }

    async trackFileUpload(data: {
        userId: string;
        fileSize: number;
        fileType: string;
        processingTime: number;
    },): Promise<void> {
        await this.analytics.writeDataPoint({
            timestamp: Date.now(),
            blobs: [data.userId, data.fileType,],
            doubles: [data.fileSize, data.processingTime,],
            indexes: ['file_upload',],
        },);
    }

    private hashQuery(query: string,): string {
        // クエリのハッシュ化（プライバシー保護）
        return btoa(query,).substring(0, 10,);
    }
}
```

### カスタムダッシュボード

```typescript
// Analytics Engine データの可視化
interface AnalyticsQuery {
    dataset: string;
    timeRange: {
        start: string;
        end: string;
    };
    groupBy?: string[];
    filters?: Record<string, string>;
}

class AnalyticsDashboard {
    async getChatMetrics(timeRange: { start: string; end: string; },) {
        // GraphQL クエリで Analytics Engine データ取得
        const query = `
      query ChatMetrics($start: String!, $end: String!) {
        viewer {
          accounts(filter: { accountTag: $accountId }) {
            analyticsEngineDatasets(filter: { name: "chat_metrics" }) {
              data(
                filter: { 
                  datetime_gte: $start,
                  datetime_lte: $end 
                }
              ) {
                timestamp
                blobs
                doubles
              }
            }
          }
        }
      }
    `;

        return await this.executeGraphQLQuery(query, timeRange,);
    }
}
```

## デプロイメント戦略

### CI/CD パイプライン

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare

on:
    push:
        branches: [main]
    pull_request:
        branches: [main]

jobs:
    deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4

            - name: Setup Node.js
              uses: actions/setup-node@v4
              with:
                  node-version: '18'
                  cache: 'pnpm'

            - name: Install dependencies
              run: pnpm install

            - name: Run tests
              run: pnpm test

            - name: Build application
              run: pnpm build:cf

            - name: Deploy to Cloudflare Pages
              uses: cloudflare/pages-action@v1
              with:
                  apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
                  accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
                  projectName: next-mastra-chat
                  directory: .next

            - name: Run database migrations
              run: pnpm db:migrate
              env:
                  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 環境分離

```bash
# 本番環境デプロイ
wrangler pages deploy .next --project-name=next-mastra-chat

# プレビュー環境デプロイ
wrangler pages deploy .next --project-name=next-mastra-chat-preview --env=preview

# データベースマイグレーション
wrangler d1 migrations apply next-mastra-chat --remote
```

## 監視・ログ

### Cloudflare ネイティブ監視

- **Real User Monitoring (RUM)**: ページパフォーマンス監視
- **Web Analytics**: トラフィック分析
- **Security Analytics**: セキュリティイベント監視

### カスタムログ実装

```typescript
// src/lib/logging/cloudflare.ts
class CloudflareLogger {
    constructor(
        private analytics: AnalyticsEngineDataset,
        private kv: KVNamespace,
    ) {}

    async logRequest(
        request: Request,
        response: Response,
        startTime: number,
    ): Promise<void> {
        const endTime = Date.now();
        const duration = endTime - startTime;

        await this.analytics.writeDataPoint({
            timestamp: startTime,
            blobs: [
                request.method,
                new URL(request.url,).pathname,
                response.status.toString(),
                request.headers.get('user-agent',) || 'unknown',
            ],
            doubles: [duration,],
            indexes: ['api_request',],
        },);
    }

    async logError(error: Error, context: Record<string, any>,): Promise<void> {
        const errorData = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: Date.now(),
        };

        // 重要なエラーは KV にも保存（詳細分析用）
        if (this.isCriticalError(error,)) {
            await this.kv.put(
                `error:${Date.now()}:${Math.random()}`,
                JSON.stringify(errorData,),
                { expirationTtl: 86400 * 7, }, // 7日間保持
            );
        }

        await this.analytics.writeDataPoint({
            timestamp: Date.now(),
            blobs: [
                error.name,
                error.message.substring(0, 100,),
                JSON.stringify(context,).substring(0, 200,),
            ],
            doubles: [1,], // エラーカウント
            indexes: ['error_log',],
        },);
    }
}
```

## コスト最適化

### リソース使用量管理

```typescript
// コスト監視とアラート
interface CloudflareCosts {
    requests: number; // Function リクエスト数
    computeTime: number; // Function 実行時間
    bandwidthGB: number; // 帯域幅使用量
    kvReads: number; // KV 読み取り操作
    kvWrites: number; // KV 書き込み操作
    r2Storage: number; // R2 ストレージ使用量
    r2Requests: number; // R2 API リクエスト
    d1Queries: number; // D1 クエリ実行数
}

class CostMonitor {
    async trackUsage(metrics: CloudflareCosts,): Promise<void> {
        // 使用量の閾値チェック
        if (metrics.requests > 100000) {
            // 月100K制限の80%
            await this.sendCostAlert('Functions requests approaching limit',);
        }

        if (metrics.kvWrites > 800) {
            // 日1K制限の80%
            await this.sendCostAlert('KV writes approaching daily limit',);
        }
    }
}
```

### パフォーマンス最適化

- **エッジキャッシュ**: 静的コンテンツの長期キャッシュ
- **画像最適化**: Cloudflare Images による自動最適化
- **圧縮**: Brotli/GZIP 圧縮の有効化
- **HTTP/3**: 最新プロトコルの活用
