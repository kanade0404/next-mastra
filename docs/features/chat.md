# チャット機能仕様書

## 概要

ChatGPTライクなリアルタイムチャット機能を提供し、RAG対応で関連ドキュメントに基づく回答生成が可能。

## 機能詳細

### 基本チャット機能

#### リアルタイムチャット

- **目的**: ユーザーとAIのスムーズな対話体験
- **実装**: Server-Sent Events (SSE) を使用したリアルタイム通信
- **UI要素**:
  - メッセージ入力フィールド（マルチライン対応）
  - 送信ボタン（Enterキー対応）
  - チャット履歴表示エリア
  - 入力中インジケーター

#### ストリーミングレスポンス

- **目的**: AIからの応答をリアルタイムで表示し、応答時間の体感を向上
- **技術仕様**:
  - OpenAI API のストリーミング対応
  - chunk ごとの差分更新表示
  - 文字単位での段階的表示
- **UI動作**:
  - タイピングインジケーター表示
  - 文字が1つずつ表示される効果
  - ストリーミング完了時の状態変更

### RAG対応チャット

#### ドキュメントベース回答生成

- **目的**: アップロードされた文書に基づく正確な回答提供
- **処理フロー**:
  1. ユーザー質問の埋め込み生成
  2. Pineconeでの類似文書検索
  3. 関連文書のコンテキスト注入
  4. GPT-4による回答生成
- **UI要素**:
  - RAGモード切り替えトグル
  - 引用元ドキュメント表示
  - 関連性スコア表示

#### コンテキスト管理

- **文書チャンク管理**: 長文書を適切なサイズに分割
- **メタデータ活用**: ファイル名、作成日、セクションなどの情報
- **関連性フィルタリング**: 閾値以下の低関連文書の除外

### セマンティック検索

#### 会話履歴検索

- **目的**: 過去の会話を意味ベースで効率的に検索
- **実装方式**:
  - 会話メッセージの自動埋め込み生成
  - Pinecone での意味検索
  - キーワード検索との組み合わせ
- **UI要素**:
  - 検索バー（サジェスト機能付き）
  - 検索結果一覧（関連度順）
  - ハイライト表示

### 会話セッション管理

#### 新規会話作成

- **機能**: 独立したチャットセッションの作成
- **実装**:
  - 一意の conversation_id 生成
  - セッション単位での履歴管理
  - タイトル自動生成（最初のメッセージから）

#### 会話履歴管理

- **保存・表示**: 全ての会話の永続化と一覧表示
- **削除機能**: 個別・一括削除オプション
- **エクスポート**: JSON/Markdown形式でのエクスポート

## UI/UX設計

### レスポンシブデザイン

- **デスクトップ**: サイドバー + メインチャットエリア
- **モバイル**: 全画面チャット + ドロワーメニュー
- **タブレット**: アダプティブレイアウト

### アクセシビリティ

- **キーボードナビゲーション**: Tab/矢印キーでの操作
- **スクリーンリーダー対応**: ARIA ラベル・役割の適切な設定
- **ハイコントラストモード**: カラーテーマ切り替え対応

### パフォーマンス最適化

- **仮想化**: 長い会話履歴の効率的なレンダリング
- **遅延ローディング**: 過去メッセージの段階的読み込み
- **キャッシュ戦略**: 頻繁にアクセスされる会話のキャッシュ

## API仕様

### メッセージ送信

```typescript
POST /api/v1/chat
{
  "message": string,
  "conversationId": string,
  "mode": "normal" | "rag",
  "context"?: {
    "documentIds": string[],
    "maxTokens": number
  }
}
```

### ストリーミングレスポンス

```typescript
GET /api/v1/chat/stream?conversationId={id}
// Server-Sent Events形式
data: {"type": "token", "content": "Hello"}
data: {"type": "done", "messageId": "123"}
```

### 会話管理

```typescript
// 会話一覧取得
GET /api/v1/conversations

// 新規会話作成
POST /api/v1/conversations
{
  "title"?: string,
  "initialMessage"?: string
}

// 会話削除
DELETE /api/v1/conversations/{id}
```

### セマンティック検索

```typescript
POST /api/v1/search/conversations
{
  "query": string,
  "limit": number,
  "filters"?: {
    "dateRange": [string, string],
    "conversationIds": string[]
  }
}
```

## データベーススキーマ

### Conversation テーブル

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata JSON
);
```

### Message テーブル

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  embedding_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata JSON,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

## セキュリティ考慮事項

### 入力サニタイゼーション

- **XSS防止**: HTML タグのエスケープ処理
- **インジェクション対策**: SQL/NoSQL インジェクション防止
- **ファイルアップロード制限**: 許可形式・サイズの制限

### レート制限

- **API制限**: ユーザー毎の分間リクエスト数制限
- **トークン使用量制限**: 月間使用量の上限設定
- **同時接続制限**: WebSocket 接続数の制御

### プライバシー保護

- **データ暗号化**: 保存時・転送時の暗号化
- **ログ管理**: 個人情報のログ出力回避
- **データ保持期間**: 自動削除ポリシーの設定

## パフォーマンス要件

### レスポンス時間

- **初回メッセージ**: < 500ms
- **ストリーミング開始**: < 200ms
- **検索応答**: < 300ms

### スループット

- **同時ユーザー**: 100人
- **メッセージ/秒**: 50件
- **検索クエリ/秒**: 20件

### リソース使用量

- **メモリ使用量**: < 512MB per instance
- **CPU使用率**: < 70% under normal load
- **ストレージ**: 効率的なインデックス設計

## テスト仕様

### ユニットテスト

- **メッセージ処理**: 送受信ロジックのテスト
- **埋め込み生成**: ベクトル化処理のテスト
- **検索機能**: セマンティック検索精度のテスト

### 統合テスト

- **API エンドポイント**: 全エンドポイントの動作確認
- **データベース連携**: CRUD操作の整合性確認
- **外部API連携**: OpenAI・Pinecone との連携テスト

### E2Eテスト

- **ユーザーフロー**: 会話作成から削除までの一連の流れ
- **レスポンシブ**: 各デバイスでの動作確認
- **パフォーマンス**: 負荷テストとレスポンス時間測定

## 運用・監視

### ログ出力

- **アクセスログ**: API リクエスト・レスポンスの記録
- **エラーログ**: 例外・警告の詳細記録
- **パフォーマンスログ**: 処理時間・リソース使用量

### メトリクス監視

- **使用量メトリクス**: メッセージ数・ユーザー数・トークン消費
- **品質メトリクス**: エラー率・応答時間・ユーザー満足度
- **ビジネスメトリクス**: DAU・会話継続率・機能利用率

### アラート設定

- **エラー率閾値**: 5% 超過時のアラート
- **応答時間悪化**: 平均応答時間の 50% 増加時
- **リソース枯渇**: CPU・メモリ使用率 80% 超過時
