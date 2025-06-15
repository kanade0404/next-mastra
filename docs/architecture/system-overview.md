# システム全体アーキテクチャ概要

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 15 App Router (React 19)                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Chat UI       │  │   Auth UI       │  │   Document UI   │ │
│  │ - Real-time     │  │ - Google OAuth  │  │ - Upload/View   │ │
│  │ - Streaming     │  │ - Profile Management  │  │ - Search        │ │
│  │ - RAG Mode      │  │ - Session Management  │  │ - Citations     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTPS/WebSocket
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Cloudflare Functions (/api/v1)                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │   Auth      │ │    Chat     │ │  Documents  │ │   Search    ││
│  │ - JWT Verify│ │ - Streaming │ │ - Upload    │ │ - Semantic  ││
│  │ - Sessions  │ │ - RAG       │ │ - Process   │ │ - Hybrid    ││
│  │ - Profile   │ │ - History   │ │ - Delete    │ │ - Filter    ││
│  └─────────────┘ ┌─────────────┐ └─────────────┘ └─────────────┘│
│                  │  Analytics  │                                │
│                  │ - Metrics   │                                │
│                  │ - Usage     │                                │
│                  └─────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
                                  │
                        ┌─────────┼─────────┐
                        │         │         │
                        ▼         ▼         ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Auth Layer    │ │   LLM Layer     │ │  Vector Layer   │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│     Clerk       │ │     Mastra      │ │    Pinecone     │
│ - Google OAuth  │ │ - OpenAI GPT-4  │ │ - Embeddings    │
│ - JWT Tokens    │ │ - Embeddings    │ │ - Similarity    │
│ - User Sync     │ │ - Streaming     │ │ - Namespaces    │
│ - Sessions      │ │ - Rate Limits   │ │ - Metadata      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                                  │
                        ┌─────────┼─────────┐
                        │         │         │
                        ▼         ▼         ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Storage Layer  │ │  Database Layer │ │   Cache Layer   │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ Cloudflare R2   │ │ Cloudflare D1   │ │ Cloudflare KV   │
│ - Documents     │ │ - Users         │ │ - Sessions      │
│ - Avatars       │ │ - Conversations │ │ - Settings      │
│ - Temp Files    │ │ - Messages      │ │ - Search Cache  │
│ - Versioning    │ │ - Documents     │ │ - Rate Limits   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                                  │
                        ┌─────────┼─────────┐
                        │         │         │
                        ▼         ▼         ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Monitoring Layer│ │  Notification   │ │     MCP         │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│     Sentry      │ │     Brevo       │ │   AI Agents     │
│ - Error Track   │ │ - Welcome Mail  │ │ - File Ops      │
│ - Performance   │ │ - Usage Alerts  │ │ - Web Scraping  │
│                 │ │ - Notifications │ │ - E2E Testing   │
│  OpenTelemetry  │ │                 │ │                 │
│ - Tracing       │ │                 │ │                 │
│ - Metrics       │ │                 │ │                 │
│                 │ │                 │ │                 │
│ Analytics Engine│ │                 │ │                 │
│ - Usage Stats   │ │                 │ │                 │
│ - Real-time     │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## データフロー

### 1. ユーザー認証フロー

```
1. User → Clerk (Google OAuth) → JWT Token
2. JWT → Cloudflare Functions → User Verification
3. User Data → Cloudflare D1 → Profile Sync
4. Session → Cloudflare KV → Cache Storage
```

### 2. チャットメッセージフロー

```
1. User Input → Chat UI → API (/api/v1/chat)
2. Message → Cloudflare D1 → Conversation Storage
3. Query → Mastra → OpenAI GPT-4 → Response
4. Streaming → Server-Sent Events → Real-time UI Update
5. Analytics → Analytics Engine → Usage Metrics
```

### 3. RAGチャットフロー

```
1. User Query → API (/api/v1/chat/rag)
2. Query → OpenAI Embeddings → Vector Generation
3. Vector → Pinecone → Similarity Search
4. Context → Relevant Documents → Context Assembly
5. Context + Query → OpenAI GPT-4 → RAG Response
6. Response + Citations → UI → Enhanced Display
```

### 4. ドキュメント処理フロー

```
1. File Upload → Cloudflare R2 → File Storage
2. File → Text Extraction (PDF/TXT) → Raw Text
3. Text → Chunking Strategy → Document Chunks
4. Chunks → OpenAI Embeddings → Vector Generation
5. Vectors + Metadata → Pinecone → Vector Storage
6. Document Info → Cloudflare D1 → Metadata Storage
```

## セキュリティアーキテクチャ

### 認証・認可フロー

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│    Clerk    │────▶│  Functions  │
│             │     │   (OAuth)   │     │   (Auth)    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                     │                  │
       │              JWT Token              API Call
       │                     │                  │
       ▼                     ▼                  ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Local Store │     │ Cloudflare  │     │ Resource    │
│ (Secure)    │     │     KV      │     │ Access      │
└─────────────┘     └─────────────┘     └─────────────┘
```

### データ暗号化

- **Transit**: HTTPS/TLS 1.3 for all communications
- **At Rest**: Cloudflare services encryption by default
- **Application**: Sensitive data field-level encryption

### アクセス制御

- **Authentication**: Clerk JWT verification
- **Authorization**: Role-based access control (RBAC)
- **Resource Isolation**: User-scoped data separation

## スケーラビリティ設計

### 水平スケーリング

- **Cloudflare Functions**: Auto-scaling serverless compute
- **Global Distribution**: Edge computing across 200+ locations
- **Database Scaling**: D1 read replicas for read-heavy workloads

### パフォーマンス最適化

- **CDN**: Static asset caching at edge
- **KV Cache**: Session and frequently accessed data
- **Vector Search**: Pinecone optimized indexing
- **Connection Pooling**: Database connection optimization

### 制限と対策

```typescript
interface ScalingLimits {
    // Cloudflare Function Limits
    memoryLimit: '128MB';
    executionTime: '30s CPU time';
    requestSize: '100MB';

    // Rate Limiting
    apiRequests: '100/minute per user';
    fileUploads: '10/hour per user';

    // Storage Limits
    d1DatabaseSize: '10GB';
    r2Storage: '10GB free tier';
    kvOperations: '100K reads, 1K writes per day';

    // Mitigation Strategies
    chunkedProcessing: 'Large files split into chunks';
    backgroundJobs: 'Heavy processing offloaded';
    caching: 'Aggressive caching strategy';
}
```

## 障害対応・復旧

### 高可用性設計

```
┌─────────────────┐
│  Multi-Region   │
│   Deployment    │
├─────────────────┤
│ Primary: US     │
│ Backup: EU      │
│ Fallback: APAC  │
└─────────────────┘
         │
┌─────────────────┐
│  Health Checks  │
├─────────────────┤
│ - API Endpoints │
│ - Database      │
│ - External APIs │
│ - Storage       │
└─────────────────┘
         │
┌─────────────────┐
│ Auto-Recovery   │
├─────────────────┤
│ - Circuit Break │
│ - Retry Logic   │
│ - Fallback Mode │
│ - Alert System │
└─────────────────┘
```

### 災害復旧計画

- **RTO (Recovery Time Objective)**: < 1 hour
- **RPO (Recovery Point Objective)**: < 5 minutes
- **Backup Strategy**: Automated daily backups
- **Failover**: Automatic regional failover

## 開発・運用フロー

### CI/CD パイプライン

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   GitHub    │──▶│   Actions   │──▶│ Cloudflare  │
│    Push     │   │    Build    │   │   Deploy    │
└─────────────┘   └─────────────┘   └─────────────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  lefthook   │   │    Tests    │   │  Production │
│  Pre-commit │   │  Coverage   │   │   Rollback  │
└─────────────┘   └─────────────┘   └─────────────┘
```

### 環境分離

- **Development**: Local with Docker/wrangler dev
- **Preview**: Cloudflare Pages preview deployments
- **Staging**: Dedicated staging environment
- **Production**: Multi-region production deployment

### 監視・アラート

```typescript
interface MonitoringStack {
    realUserMonitoring: 'Cloudflare Analytics';
    errorTracking: 'Sentry';
    performanceMonitoring: 'OpenTelemetry → Grafana Cloud';
    logAggregation: 'Pino → Analytics Engine';
    customMetrics: 'Analytics Engine';
    alerting: 'PagerDuty integration';
}
```

## セキュリティ考慮事項

### 脅威モデル

1. **認証バイパス**: JWT token validation, session hijacking
2. **データ漏洩**: Unauthorized access to conversations/documents
3. **DDoS攻撃**: Rate limiting, Cloudflare DDoS protection
4. **インジェクション**: Input validation, parameterized queries
5. **プライバシー**: GDPR compliance, data minimization

### セキュリティ対策

- **WAF**: Cloudflare Web Application Firewall
- **Bot Protection**: Cloudflare Bot Management
- **Rate Limiting**: API and resource access limits
- **Input Validation**: Zod schema validation
- **Output Encoding**: XSS prevention
- **CSRF Protection**: Token-based CSRF protection

## コスト最適化

### リソース使用量監視

```typescript
interface CostOptimization {
    // Free Tier Monitoring
    cloudflarePages: '500 builds/month';
    cloudflareFunctions: '100K requests/day';
    cloudflareD1: '25B row reads/month';
    cloudflareR2: '10GB storage';
    cloudflareKV: '100K reads, 1K writes/day';

    // External Services
    pinecone: '1 index, 100K vectors (starter)';
    openai: 'Pay per token usage';
    clerk: '10K MAUs free';
    sentry: '10K errors/month';

    // Cost Controls
    usageAlerts: '80% threshold notifications';
    rateLimiting: 'Prevent abuse and overage';
    caching: 'Reduce API calls and compute';
    optimization: 'Efficient algorithms and data structures';
}
```

このアーキテクチャにより、スケーラブルで高性能、かつコスト効率的なLLMアプリケーションテンプレートを実現します。
