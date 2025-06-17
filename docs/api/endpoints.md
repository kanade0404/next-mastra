# API エンドポイント仕様書

## 概要

RESTful API 設計に基づく `/api/v1` エンドポイント群。統一されたレスポンス形式、エラーハンドリング、認証、レート制限を提供。

## API 設計原則

### RESTful 設計

- **リソースベース**: エンドポイントはリソースを表現
- **HTTP メソッド**: 標準的な CRUD 操作
- **ステータスコード**: 適切な HTTP ステータスの使用
- **統一レスポンス**: 一貫したレスポンス形式

### バージョニング戦略

- **URL パス**: `/api/v1/` プレフィックス
- **後方互換性**: 破壊的変更時のバージョン増分
- **非推奨化**: 段階的な旧バージョン廃止

## 共通仕様

### レスポンス形式

```typescript
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

// 成功レスポンス例
{
  "success": true,
  "data": {
    "id": "conversation_123",
    "title": "新しい会話"
  },
  "meta": {
    "timestamp": "2024-12-15T10:00:00Z",
    "requestId": "req_abc123",
    "version": "v1"
  }
}

// エラーレスポンス例
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "message",
      "reason": "Message cannot be empty"
    }
  },
  "meta": {
    "timestamp": "2024-12-15T10:00:00Z",
    "requestId": "req_abc123",
    "version": "v1"
  }
}
```

### エラーコード

```typescript
enum APIErrorCode {
    // 認証・認可
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',

    // バリデーション
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_FORMAT = 'INVALID_FORMAT',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

    // リソース
    NOT_FOUND = 'NOT_FOUND',
    RESOURCE_EXISTS = 'RESOURCE_EXISTS',
    RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',

    // システム
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

    // 外部API
    EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
    OPENAI_API_ERROR = 'OPENAI_API_ERROR',
    PINECONE_API_ERROR = 'PINECONE_API_ERROR',
}
```

### 認証

```typescript
// Authorization ヘッダー
Authorization: Bearer <jwt_token>

// 認証エラーレスポンス
HTTP/1.1 401 Unauthorized
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### レート制限

```typescript
// レスポンスヘッダー
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200

// 制限超過時
HTTP/1.1 429 Too Many Requests
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "details": {
      "retryAfter": 60
    }
  }
}
```

## 認証関連エンドポイント

### GET /api/v1/auth/me

現在のユーザー情報を取得

```typescript
// Request
GET /api/v1/auth/me
Authorization: Bearer <jwt_token>

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "clerkId": "user_2abc123",
      "email": "user@example.com",
      "firstName": "太郎",
      "lastName": "田中",
      "displayName": "田中太郎",
      "profileImageUrl": "https://...",
      "role": "user",
      "preferences": {
        "theme": "dark",
        "language": "ja"
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLoginAt": "2024-12-15T09:00:00Z"
    },
    "session": {
      "sessionId": "session_123",
      "expiresAt": "2024-12-16T10:00:00Z",
      "lastActiveAt": "2024-12-15T10:00:00Z"
    }
  }
}
```

### PATCH /api/v1/auth/profile

ユーザープロファイル更新

```typescript
// Request
PATCH /api/v1/auth/profile
Content-Type: application/json
{
  "displayName": "田中太郎",
  "timezone": "Asia/Tokyo",
  "preferences": {
    "theme": "dark",
    "chatSettings": {
      "streamingEnabled": true,
      "ragModeDefault": false
    }
  }
}

// Response
{
  "success": true,
  "data": {
    "user": { /* 更新後のユーザー情報 */ },
    "updatedFields": ["displayName", "timezone", "preferences"]
  }
}
```

### GET /api/v1/auth/sessions

アクティブセッション一覧

```typescript
// Response
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session_123",
        "deviceInfo": {
          "platform": "macOS",
          "browser": "Chrome",
          "isMobile": false
        },
        "locationInfo": {
          "country": "JP",
          "city": "Tokyo"
        },
        "createdAt": "2024-12-15T09:00:00Z",
        "lastActiveAt": "2024-12-15T10:00:00Z",
        "isCurrent": true
      }
    ]
  }
}
```

## 会話管理エンドポイント

### GET /api/v1/conversations

会話一覧取得

```typescript
// Request
GET /api/v1/conversations?limit=20&offset=0&sort=updated_at&order=desc

// Response
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conversation_123",
        "title": "プロジェクト計画について",
        "messageCount": 15,
        "lastMessage": {
          "content": "ありがとうございました。",
          "role": "assistant",
          "createdAt": "2024-12-15T09:30:00Z"
        },
        "createdAt": "2024-12-15T09:00:00Z",
        "updatedAt": "2024-12-15T09:30:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### POST /api/v1/conversations

新規会話作成

```typescript
// Request
POST /api/v1/conversations
{
  "title": "新しい会話",
  "initialMessage": "こんにちは"
}

// Response
{
  "success": true,
  "data": {
    "conversation": {
      "id": "conversation_124",
      "title": "新しい会話",
      "messageCount": 0,
      "createdAt": "2024-12-15T10:00:00Z",
      "updatedAt": "2024-12-15T10:00:00Z"
    }
  }
}
```

### GET /api/v1/conversations/{id}

特定会話の詳細取得

```typescript
// Response
{
  "success": true,
  "data": {
    "conversation": {
      "id": "conversation_123",
      "title": "プロジェクト計画について",
      "createdAt": "2024-12-15T09:00:00Z",
      "updatedAt": "2024-12-15T09:30:00Z"
    },
    "messages": [
      {
        "id": "msg_1",
        "role": "user",
        "content": "プロジェクトの進捗はいかがですか？",
        "createdAt": "2024-12-15T09:00:00Z"
      },
      {
        "id": "msg_2",
        "role": "assistant",
        "content": "プロジェクトは順調に進んでいます。",
        "createdAt": "2024-12-15T09:01:00Z",
        "metadata": {
          "model": "gpt-4",
          "tokensUsed": 25,
          "responseTime": 1.2
        }
      }
    ]
  }
}
```

### DELETE /api/v1/conversations/{id}

会話削除

```typescript
// Response
{
  "success": true,
  "data": {
    "deletedAt": "2024-12-15T10:00:00Z"
  }
}
```

## チャット関連エンドポイント

### POST /api/v1/chat

通常チャット

```typescript
// Request
POST /api/v1/chat
{
  "message": "今日の天気はいかがですか？",
  "conversationId": "conversation_123",
  "stream": true,
  "model": "gpt-4"
}

// Streaming Response (Server-Sent Events)
data: {"type": "start", "messageId": "msg_124"}

data: {"type": "token", "content": "今日"}

data: {"type": "token", "content": "の"}

data: {"type": "token", "content": "天気"}

data: {"type": "done", "message": {"id": "msg_124", "content": "今日の天気は晴れです。", "tokensUsed": 15, "responseTime": 2.1}}
```

### POST /api/v1/chat/rag

RAG対応チャット

```typescript
// Request
POST /api/v1/chat/rag
{
  "message": "プロジェクトの要件について教えてください",
  "conversationId": "conversation_123",
  "documentIds": ["doc_1", "doc_2"],
  "searchParams": {
    "topK": 5,
    "scoreThreshold": 0.7
  }
}

// Streaming Response
data: {"type": "search_start"}

data: {"type": "search_results", "count": 3, "searchTime": 0.5}

data: {"type": "context", "sources": [{"documentName": "要件定義書.pdf", "pageNumber": 1}]}

data: {"type": "generation_start"}

data: {"type": "token", "content": "プロジェクト"}

data: {"type": "citation", "source": {"documentId": "doc_1", "chunkId": "chunk_1", "score": 0.85}}

data: {"type": "done", "message": {"id": "msg_125", "content": "...", "sources": [...]}}
```

## ドキュメント管理エンドポイント

### POST /api/v1/documents/upload

ドキュメントアップロード

```typescript
// Request (multipart/form-data)
POST /api/v1/documents/upload
Content-Type: multipart/form-data

file: <PDF file>
metadata: {
  "tags": ["プロジェクト", "要件"],
  "category": "仕様書",
  "description": "システム要件定義書"
}

// Response
{
  "success": true,
  "data": {
    "document": {
      "id": "doc_123",
      "filename": "requirements.pdf",
      "fileSize": 1024000,
      "status": "processing",
      "uploadedAt": "2024-12-15T10:00:00Z",
      "metadata": {
        "tags": ["プロジェクト", "要件"],
        "category": "仕様書"
      }
    },
    "processingEstimate": "2-3 minutes"
  }
}
```

### GET /api/v1/documents

ドキュメント一覧

```typescript
// Request
GET /api/v1/documents?status=completed&category=仕様書&limit=10

// Response
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc_123",
        "filename": "requirements.pdf",
        "fileSize": 1024000,
        "status": "completed",
        "chunkCount": 25,
        "uploadedAt": "2024-12-15T10:00:00Z",
        "processedAt": "2024-12-15T10:02:30Z",
        "metadata": {
          "tags": ["プロジェクト", "要件"],
          "category": "仕様書",
          "pageCount": 10
        }
      }
    ],
    "summary": {
      "totalDocuments": 50,
      "totalSize": 52428800,
      "statusBreakdown": {
        "completed": 45,
        "processing": 3,
        "failed": 2
      }
    }
  }
}
```

### GET /api/v1/documents/{id}

ドキュメント詳細

```typescript
// Response
{
  "success": true,
  "data": {
    "document": {
      "id": "doc_123",
      "filename": "requirements.pdf",
      "fileSize": 1024000,
      "status": "completed",
      "chunkCount": 25,
      "uploadedAt": "2024-12-15T10:00:00Z",
      "processedAt": "2024-12-15T10:02:30Z",
      "metadata": {
        "pageCount": 10,
        "language": "ja",
        "author": "田中太郎"
      }
    },
    "chunks": [
      {
        "id": "chunk_1",
        "content": "1. プロジェクト概要\n本プロジェクトは...",
        "chunkIndex": 0,
        "tokenCount": 150,
        "metadata": {
          "section": "概要",
          "pageNumber": 1
        }
      }
    ],
    "processing": {
      "extractionTime": 5.2,
      "chunkingTime": 2.1,
      "embeddingTime": 15.7,
      "totalTime": 23.0
    }
  }
}
```

### DELETE /api/v1/documents/{id}

ドキュメント削除

```typescript
// Response
{
  "success": true,
  "data": {
    "deletedAt": "2024-12-15T10:00:00Z",
    "deletedChunks": 25,
    "freedSpace": 1024000
  }
}
```

## 検索エンドポイント

### POST /api/v1/search/semantic

セマンティック検索

```typescript
// Request
POST /api/v1/search/semantic
{
  "query": "プロジェクトのスケジュールについて",
  "documentIds": ["doc_1", "doc_2"],
  "limit": 10,
  "threshold": 0.7,
  "filters": {
    "tags": ["プロジェクト"],
    "dateRange": ["2024-01-01", "2024-12-31"]
  }
}

// Response
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "chunk_1",
        "content": "プロジェクトのスケジュールは以下の通りです...",
        "score": 0.89,
        "document": {
          "id": "doc_1",
          "filename": "project_plan.pdf",
          "metadata": {
            "section": "スケジュール",
            "pageNumber": 3
          }
        }
      }
    ],
    "searchMetrics": {
      "totalResults": 25,
      "searchTime": 0.45,
      "searchType": "semantic"
    }
  }
}
```

### POST /api/v1/search/conversations

会話検索

```typescript
// Request
POST /api/v1/search/conversations
{
  "query": "機械学習について話した会話",
  "limit": 10,
  "filters": {
    "dateRange": ["2024-12-01", "2024-12-15"]
  }
}

// Response
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conversation_123",
        "title": "機械学習モデルの選択",
        "relevantMessages": [
          {
            "id": "msg_1",
            "content": "機械学習のアルゴリズムについて...",
            "role": "user",
            "score": 0.92,
            "createdAt": "2024-12-10T14:30:00Z"
          }
        ],
        "score": 0.88,
        "lastMessageAt": "2024-12-10T15:00:00Z"
      }
    ],
    "searchMetrics": {
      "totalResults": 5,
      "searchTime": 0.32
    }
  }
}
```

## ファイル管理エンドポイント

### POST /api/v1/files/upload

ファイルアップロード

```typescript
// Request (multipart/form-data)
POST /api/v1/files/upload
Content-Type: multipart/form-data

file: <file>
type: "document" | "avatar" | "temp"
metadata: {
  "purpose": "chat_attachment",
  "conversationId": "conversation_123"
}

// Response
{
  "success": true,
  "data": {
    "file": {
      "id": "file_123",
      "filename": "document.pdf",
      "size": 1024000,
      "mimeType": "application/pdf",
      "url": "https://files.example.com/file_123",
      "uploadedAt": "2024-12-15T10:00:00Z",
      "expiresAt": "2024-12-22T10:00:00Z"
    }
  }
}
```

### GET /api/v1/files/{id}

ファイル取得

```typescript
// Response (ファイルの直接配信)
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Length: 1024000
Content-Disposition: attachment; filename="document.pdf"
Cache-Control: private, max-age=3600

<binary file content>
```

### DELETE /api/v1/files/{id}

ファイル削除

```typescript
// Response
{
  "success": true,
  "data": {
    "deletedAt": "2024-12-15T10:00:00Z"
  }
}
```

## 統計・分析エンドポイント

### GET /api/v1/analytics/usage

使用量統計

```typescript
// Request
GET /api/v1/analytics/usage?period=month&start=2024-12-01&end=2024-12-31

// Response
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-12-01",
      "end": "2024-12-31"
    },
    "metrics": {
      "messages": {
        "total": 1500,
        "user": 750,
        "assistant": 750
      },
      "conversations": {
        "total": 50,
        "active": 25
      },
      "documents": {
        "uploaded": 10,
        "totalSize": 52428800,
        "chunksGenerated": 500
      },
      "tokens": {
        "total": 150000,
        "chat": 100000,
        "embeddings": 50000
      },
      "costs": {
        "total": 15.50,
        "breakdown": {
          "chatTokens": 10.00,
          "embeddingTokens": 2.50,
          "storage": 1.00,
          "compute": 2.00
        }
      }
    },
    "trends": {
      "dailyMessages": [
        {"date": "2024-12-01", "count": 45},
        {"date": "2024-12-02", "count": 52}
      ],
      "topCategories": [
        {"category": "技術相談", "count": 300},
        {"category": "プロジェクト", "count": 250}
      ]
    }
  }
}
```

## システム管理エンドポイント

### GET /api/v1/system/health

ヘルスチェック

```typescript
// Response
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-12-15T10:00:00Z",
    "version": "1.0.0",
    "services": {
      "database": {
        "status": "healthy",
        "responseTime": 12,
        "lastCheck": "2024-12-15T10:00:00Z"
      },
      "vectorDb": {
        "status": "healthy",
        "responseTime": 45,
        "lastCheck": "2024-12-15T10:00:00Z"
      },
      "llm": {
        "status": "healthy",
        "responseTime": 230,
        "lastCheck": "2024-12-15T10:00:00Z"
      },
      "storage": {
        "status": "healthy",
        "responseTime": 8,
        "lastCheck": "2024-12-15T10:00:00Z"
      }
    },
    "metrics": {
      "uptime": 86400,
      "requestsPerMinute": 45,
      "errorRate": 0.01
    }
  }
}
```

### GET /api/v1/system/status

システム状態

```typescript
// Response
{
  "success": true,
  "data": {
    "environment": "production",
    "region": "ap-northeast-1",
    "deployment": {
      "version": "1.0.0",
      "buildId": "abc123",
      "deployedAt": "2024-12-15T09:00:00Z"
    },
    "limits": {
      "rateLimit": "100 requests/minute",
      "fileUpload": "25MB",
      "conversationHistory": "1000 messages"
    },
    "features": {
      "ragChat": true,
      "documentUpload": true,
      "semanticSearch": true,
      "multiLanguage": false
    }
  }
}
```

## Webhook エンドポイント

### POST /api/webhooks/clerk

Clerk Webhook

```typescript
// Request
POST /api/webhooks/clerk
Svix-Id: msg_123
Svix-Timestamp: 1640995200
Svix-Signature: v1,signature_here

{
  "type": "user.created",
  "data": {
    "id": "user_2abc123",
    "email_addresses": [
      {
        "email_address": "user@example.com",
        "verification": {
          "status": "verified"
        }
      }
    ],
    "first_name": "太郎",
    "last_name": "田中",
    "profile_image_url": "https://...",
    "created_at": 1640995200000
  }
}

// Response
{
  "success": true,
  "data": {
    "processed": true,
    "userId": "user_123"
  }
}
```

## エラーハンドリング

### バリデーションエラー

```typescript
// 400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field": "message",
      "value": "",
      "constraint": "Message cannot be empty"
    }
  }
}
```

### リソースエラー

```typescript
// 404 Not Found
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Conversation not found",
    "details": {
      "resource": "conversation",
      "id": "conversation_nonexistent"
    }
  }
}
```

### サーバーエラー

```typescript
// 500 Internal Server Error
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "details": {
      "requestId": "req_abc123",
      "timestamp": "2024-12-15T10:00:00Z"
    }
  }
}
```
