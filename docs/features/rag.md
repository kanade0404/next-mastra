# RAG (Retrieval-Augmented Generation) 仕様書

## 概要

Pinecone vector database を活用したRAGシステムにより、ドキュメントに基づく正確な回答生成を実現。ユーザーがアップロードした文書を検索し、関連情報をコンテキストとして活用する。

## アーキテクチャ

### RAG パイプライン

```
Document Upload → Text Extraction → Chunking → Embedding → Vector Store
                                                                    ↓
User Query → Query Embedding → Similarity Search → Context Retrieval
                                                                    ↓
Context + Query → LLM Prompt → Generated Response → Citation Links
```

## 機能詳細

### ドキュメント処理

#### サポートファイル形式

- **PDF**: pdf-parse ライブラリを使用
- **テキスト**: .txt, .md ファイル
- **将来拡張**: .docx, .pptx（Phase 2で検討）

#### テキスト抽出

```typescript
interface DocumentProcessor {
    extractText(file: File,): Promise<string>;
    validateFormat(file: File,): boolean;
    extractMetadata(file: File,): DocumentMetadata;
}

interface DocumentMetadata {
    filename: string;
    filesize: number;
    mimeType: string;
    pageCount?: number;
    author?: string;
    createdAt: Date;
    language?: string;
}
```

#### チャンク分割戦略

- **固定サイズチャンク**: 1000トークン単位（重複100トークン）
- **意味単位分割**: 段落・セクション境界を考慮
- **階層構造保持**: 見出し・章構造の維持

```typescript
interface ChunkingStrategy {
    maxTokens: number; // 1000
    overlapTokens: number; // 100
    respectBoundaries: boolean; // true
    preserveStructure: boolean; // true
}

interface DocumentChunk {
    id: string;
    documentId: string;
    content: string;
    tokens: number;
    chunkIndex: number;
    metadata: ChunkMetadata;
}

interface ChunkMetadata {
    section?: string;
    pageNumber?: number;
    hierarchy: string[];
    startPosition: number;
    endPosition: number;
}
```

### 埋め込み生成

#### OpenAI Embeddings 活用

- **モデル**: text-embedding-3-large (3072次元)
- **バッチ処理**: 複数チャンクの効率的な処理
- **レート制限対応**: 指数バックオフによるリトライ

```typescript
interface EmbeddingService {
    generateEmbedding(text: string,): Promise<number[]>;
    generateBatchEmbeddings(texts: string[],): Promise<number[][]>;
    estimateTokens(text: string,): number;
}

interface EmbeddingConfig {
    model: 'text-embedding-3-large';
    dimensions: 3072;
    batchSize: 100;
    maxRetries: 3;
    retryDelay: 1000;
}
```

### Vector Database 統合

#### Pinecone 設定

- **インデックス**: 3072次元、コサイン類似度
- **名前空間**: ユーザー毎の分離
- **メタデータフィルタリング**: ドキュメント属性による絞り込み

```typescript
interface PineconeConfig {
    indexName: string;
    dimension: 3072;
    metric: 'cosine';
    namespace: string; // user_${userId}
}

interface VectorMetadata {
    documentId: string;
    chunkId: string;
    filename: string;
    chunkIndex: number;
    section?: string;
    pageNumber?: number;
    uploadedAt: string;
    fileType: string;
}
```

#### ベクトル操作

```typescript
interface VectorStore {
    upsert(vectors: Vector[],): Promise<void>;
    query(
        queryVector: number[],
        topK: number,
        filter?: MetadataFilter,
    ): Promise<QueryResult[]>;
    delete(vectorIds: string[],): Promise<void>;
    update(vectorId: string, metadata: VectorMetadata,): Promise<void>;
}

interface QueryResult {
    id: string;
    score: number;
    metadata: VectorMetadata;
    content?: string;
}
```

### 検索・取得機能

#### セマンティック検索

- **類似度閾値**: 0.7以上の関連文書のみ取得
- **結果数制限**: 最大10件のチャンク取得
- **多様性確保**: MMR (Maximal Marginal Relevance) アルゴリズム適用

```typescript
interface SearchParams {
    query: string;
    topK: number; // 10
    scoreThreshold: number; // 0.7
    diversityLambda: number; // 0.5 (MMR parameter)
    filter?: {
        documentIds?: string[];
        fileTypes?: string[];
        dateRange?: [string, string,];
    };
}

interface SearchResult {
    chunks: RelevantChunk[];
    totalResults: number;
    searchTime: number;
}

interface RelevantChunk {
    id: string;
    content: string;
    score: number;
    documentName: string;
    section?: string;
    pageNumber?: number;
}
```

#### ハイブリッド検索

- **セマンティック検索**: ベクトル類似度ベース
- **キーワード検索**: Cloudflare D1 FTS (Full-Text Search)
- **結果統合**: RRF (Reciprocal Rank Fusion) による統合

```typescript
interface HybridSearchResult {
    semanticResults: SearchResult;
    keywordResults: SearchResult;
    fusedResults: SearchResult;
    weights: {
        semantic: number; // 0.7
        keyword: number; // 0.3
    };
}
```

### コンテキスト生成

#### プロンプト構築

```typescript
interface RAGPrompt {
    systemPrompt: string;
    contextChunks: RelevantChunk[];
    userQuery: string;
    maxContextTokens: number; // 4000
}

const RAG_SYSTEM_PROMPT = `
あなたは提供されたドキュメントに基づいて質問に回答するAIアシスタントです。

回答時の指示：
1. 提供されたコンテキストのみを基に回答してください
2. 情報が不足している場合は、不明である旨を明記してください
3. 回答の根拠となる文書名やページ番号を明示してください
4. 推測や一般的な知識での補完は避けてください

提供されたコンテキスト：
{context_chunks}

質問: {user_query}
`;
```

#### コンテキスト最適化

- **トークン制限**: 4000トークン以内でのコンテキスト構築
- **関連度順ソート**: 高関連度チャンクの優先的使用
- **重複除去**: 類似内容チャンクの統合

```typescript
interface ContextOptimizer {
    buildContext(chunks: RelevantChunk[], maxTokens: number,): string;
    deduplicateChunks(chunks: RelevantChunk[],): RelevantChunk[];
    prioritizeChunks(chunks: RelevantChunk[],): RelevantChunk[];
}
```

### 回答生成・引用

#### LLM 統合

- **モデル**: GPT-4 turbo
- **温度設定**: 0.1 (再現性重視)
- **最大トークン**: 1000

```typescript
interface RAGResponse {
    answer: string;
    sources: SourceCitation[];
    confidence: number;
    usedChunks: string[];
    processingTime: number;
}

interface SourceCitation {
    documentName: string;
    pageNumber?: number;
    section?: string;
    chunkId: string;
    relevanceScore: number;
    excerpt: string; // 関連部分の抜粋
}
```

#### 引用生成

- **自動引用**: 使用されたチャンクの自動抽出
- **リンク生成**: 元文書への直接リンク
- **信頼度スコア**: 回答の信頼性指標

## API仕様

### ドキュメント管理

```typescript
// ドキュメントアップロード
POST /api/v1/documents/upload
Content-Type: multipart/form-data
{
  file: File,
  metadata?: {
    tags: string[],
    category: string,
    description: string
  }
}

// Response
{
  documentId: string,
  filename: string,
  status: "processing" | "completed" | "failed",
  chunkCount: number,
  processingTime: number
}
```

```typescript
// ドキュメント一覧
GET /api/v1/documents
{
  documents: DocumentInfo[],
  totalCount: number,
  totalSize: number
}

interface DocumentInfo {
  id: string;
  filename: string;
  fileSize: number;
  chunkCount: number;
  uploadedAt: string;
  status: DocumentStatus;
  metadata: DocumentMetadata;
}
```

### RAG検索

```typescript
// セマンティック検索
POST /api/v1/search/semantic
{
  query: string,
  documentIds?: string[],
  limit: number,
  threshold: number
}

// Response
{
  results: SearchResult[],
  totalMatches: number,
  searchTime: number
}
```

### RAGチャット

```typescript
// RAG対応チャット
POST /api/v1/chat/rag
{
  message: string,
  conversationId: string,
  documentIds?: string[],
  searchParams?: SearchParams
}

// Response (Streaming)
data: {"type": "search_start"}
data: {"type": "search_results", "count": 5}
data: {"type": "generation_start"}
data: {"type": "token", "content": "回答の"}
data: {"type": "token", "content": "内容"}
data: {"type": "citation", "source": {...}}
data: {"type": "done", "response": {...}}
```

## データベーススキーマ

### Document テーブル

```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  chunk_count INTEGER DEFAULT 0,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  metadata JSON,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Document_Chunk テーブル

```sql
CREATE TABLE document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER NOT NULL,
  embedding_id TEXT,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);
```

### Search_Log テーブル

```sql
CREATE TABLE search_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  result_count INTEGER NOT NULL,
  search_time_ms INTEGER NOT NULL,
  search_type TEXT NOT NULL CHECK (search_type IN ('semantic', 'keyword', 'hybrid')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## セキュリティ・プライバシー

### データ分離

- **ユーザー分離**: Pinecone namespace によるデータ分離
- **アクセス制御**: ドキュメントへのユーザー権限チェック
- **データ暗号化**: 機密ドキュメントの暗号化保存

### プライバシー保護

- **データ保持**: ユーザー設定による自動削除
- **匿名化**: 検索ログの個人情報除去
- **GDPR対応**: データ削除要求への対応

## パフォーマンス最適化

### 処理効率化

- **バッチ処理**: 大量文書の並列処理
- **キャッシュ戦略**: 頻繁検索結果のキャッシュ
- **インデックス最適化**: Pinecone インデックス設計

### レスポンス時間

- **検索レスポンス**: < 500ms
- **埋め込み生成**: < 2秒/1000トークン
- **RAG応答開始**: < 1秒

## 監視・分析

### 品質メトリクス

- **検索精度**: ユーザーフィードバックベース
- **回答関連性**: 人手評価サンプリング
- **引用正確性**: 自動検証ツール

### 使用量監視

- **ドキュメント処理量**: 日次/月次集計
- **検索クエリ数**: パターン分析
- **トークン消費量**: コスト最適化

### エラー監視

- **処理失敗率**: ドキュメント処理エラー
- **検索タイムアウト**: レスポンス時間監視
- **API制限エラー**: レート制限到達監視

## 将来拡張計画

### Phase 2 機能

- **多言語対応**: 自動言語検出・翻訳
- **画像OCR**: PDF内画像からのテキスト抽出
- **構造化データ**: テーブル・図表の理解

### Phase 3 機能

- **ファイン調整**: ドメイン特化モデル
- **インタラクティブ検索**: 対話的絞り込み
- **知識グラフ**: エンティティ関係の構築
