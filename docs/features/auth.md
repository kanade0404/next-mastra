# 認証・ユーザー管理仕様書

## 概要

Clerk を使用したセキュアな認証システムと包括的なユーザー管理機能。Google OAuth 認証を中心とし、セッション管理、ユーザープロファイル、権限制御を提供。

## 認証アーキテクチャ

### Clerk 統合

```
User → Google OAuth → Clerk → JWT Token → Next.js App
                        ↓
                   User Sync → Cloudflare D1
```

### 認証フロー

1. **初回アクセス**: 未認証ユーザーのサインイン画面リダイレクト
2. **Google OAuth**: Clerk 経由での Google 認証
3. **トークン発行**: JWT ベースのセッショントークン
4. **ユーザー同期**: Clerk ユーザー情報の D1 データベース同期
5. **認証完了**: アプリケーション画面への遷移

## 機能詳細

### ソーシャルログイン

#### Google OAuth 設定

```typescript
interface ClerkGoogleConfig {
    googleClientId: string;
    googleClientSecret: string;
    redirectUri: string;
    scopes: string[]; // ["email", "profile"]
}

interface GoogleUserInfo {
    sub: string; // Google User ID
    email: string;
    email_verified: boolean;
    name: string;
    picture: string;
    given_name: string;
    family_name: string;
    locale: string;
}
```

#### サポート認証方式

- **Google OAuth 2.0**: プライマリ認証方式
- **メールアドレス**: バックアップ認証（Phase 2）
- **GitHub OAuth**: 開発者向け（Phase 3）

### ユーザープロファイル管理

#### プロファイル情報

```typescript
interface UserProfile {
    // Clerk 基本情報
    clerkId: string;
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string;

    // アプリケーション拡張情報
    displayName: string;
    timezone: string;
    language: string;
    preferences: UserPreferences;

    // システム情報
    createdAt: Date;
    lastLoginAt: Date;
    isActive: boolean;
    role: UserRole;
}

interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    chatSettings: {
        streamingEnabled: boolean;
        ragModeDefault: boolean;
        maxMessageHistory: number;
    };
    notifications: {
        emailEnabled: boolean;
        usageAlerts: boolean;
        systemUpdates: boolean;
    };
    privacy: {
        profileVisibility: 'private' | 'public';
        analyticsOptOut: boolean;
    };
}

enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
    MODERATOR = 'moderator',
}
```

#### プロファイル編集

- **基本情報編集**: 表示名、タイムゾーン、言語設定
- **プリファレンス設定**: UI テーマ、チャット設定、通知設定
- **プライバシー設定**: データ使用許可、プロファイル公開設定
- **画像アップロード**: プロフィール画像の変更（Cloudflare R2 使用）

### セッション管理

#### JWT トークン構造

```typescript
interface ClerkJWT {
    // Standard Claims
    sub: string; // Clerk User ID
    iat: number; // Issued At
    exp: number; // Expiration
    iss: string; // Issuer (Clerk)

    // Custom Claims
    role: UserRole;
    email: string;
    metadata: {
        lastActiveAt: string;
        deviceId: string;
        ipAddress: string;
    };
}
```

#### セッション設定

- **有効期間**: 24時間（自動更新）
- **リフレッシュ**: 12時間毎の自動トークン更新
- **マルチデバイス**: 複数デバイス同時ログイン対応
- **無効化**: 明示的ログアウト・セキュリティ違反時の強制ログアウト

#### セッション監視

```typescript
interface SessionActivity {
    sessionId: string;
    userId: string;
    deviceInfo: {
        userAgent: string;
        platform: string;
        browser: string;
        isMobile: boolean;
    };
    locationInfo: {
        ipAddress: string;
        country: string;
        city: string;
    };
    activityLog: {
        loginAt: Date;
        lastActiveAt: Date;
        actionsCount: number;
        isActive: boolean;
    };
}
```

### 権限制御

#### ルートベース認証

```typescript
// middleware.ts
import { authMiddleware, } from '@clerk/nextjs';

export default authMiddleware({
    publicRoutes: ['/', '/api/health',],
    ignoredRoutes: ['/api/webhooks/(.*)',],
    afterAuth(auth, req,) {
        // カスタム認証ロジック
        if (!auth.userId && !auth.isPublicRoute) {
            return redirectToSignIn({ returnBackUrl: req.url, },);
        }

        // 管理者限定ルート
        if (req.nextUrl.pathname.startsWith('/admin',)) {
            return enforceAdminAccess(auth,);
        }
    },
},);
```

#### API 認証ガード

```typescript
interface AuthGuard {
    requireAuth(): (req: Request,) => Promise<User | null>;
    requireRole(role: UserRole,): (req: Request,) => Promise<User | null>;
    requireOwnership(resourceId: string,): (req: Request,) => Promise<boolean>;
}

// 使用例
const authenticatedUser = await requireAuth()(request,);
const adminUser = await requireRole(UserRole.ADMIN,)(request,);
const hasAccess = await requireOwnership(conversationId,)(request,);
```

## API仕様

### 認証関連エンドポイント

#### ユーザー情報取得

```typescript
GET /api/v1/auth/me
Authorization: Bearer <jwt_token>

// Response
{
  user: UserProfile,
  session: {
    sessionId: string,
    expiresAt: string,
    lastActiveAt: string
  },
  permissions: string[]
}
```

#### プロファイル更新

```typescript
PATCH /api/v1/auth/profile
{
  displayName?: string,
  timezone?: string,
  language?: string,
  preferences?: Partial<UserPreferences>
}

// Response
{
  user: UserProfile,
  updatedFields: string[]
}
```

#### セッション管理

```typescript
// 全セッション取得
GET / api / v1 / auth / sessions;

// 特定セッション無効化
DELETE / api / v1 / auth / sessions / { sessionId, };

// 全セッション無効化（現在除く）
DELETE / api / v1 / auth / sessions / others;
```

### Webhook エンドポイント

#### Clerk Webhook

```typescript
POST /api/webhooks/clerk
{
  type: "user.created" | "user.updated" | "user.deleted" | "session.created" | "session.ended",
  data: {
    id: string,
    object: "user" | "session",
    // Clerk オブジェクトデータ
  }
}
```

## データベーススキーマ

### Users テーブル

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  profile_image_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'ja',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  preferences JSON,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_login ON users(last_login_at);
```

### User_Sessions テーブル

```sql
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  clerk_session_id TEXT UNIQUE NOT NULL,
  device_info JSON,
  location_info JSON,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expired_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_active ON user_sessions(is_active, last_active_at);
```

### User_Activity テーブル

```sql
CREATE TABLE user_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSON,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES user_sessions(id)
);

CREATE INDEX idx_activity_user_id ON user_activity(user_id, created_at);
CREATE INDEX idx_activity_action_type ON user_activity(action_type);
```

## セキュリティ実装

### JWT 検証

```typescript
import { ClerkJWTVerifier, } from '@clerk/nextjs';

interface JWTVerificationResult {
    valid: boolean;
    payload?: ClerkJWT;
    error?: string;
}

async function verifyJWT(token: string,): Promise<JWTVerificationResult> {
    try {
        const verifier = ClerkJWTVerifier({
            secretKey: process.env.CLERK_SECRET_KEY,
        },);

        const payload = await verifier.verify(token,);
        return { valid: true, payload, };
    } catch (error) {
        return { valid: false, error: error.message, };
    }
}
```

### 認証ミドルウェア

```typescript
export async function authenticateRequest(
    request: Request,
): Promise<AuthContext> {
    const token = extractTokenFromHeader(request,);

    if (!token) {
        throw new UnauthorizedError('Authentication token required',);
    }

    const verification = await verifyJWT(token,);
    if (!verification.valid) {
        throw new UnauthorizedError('Invalid authentication token',);
    }

    const user = await getUserByClerkId(verification.payload.sub,);
    if (!user || !user.isActive) {
        throw new ForbiddenError('User account is inactive',);
    }

    return {
        user,
        session: verification.payload,
        permissions: await getUserPermissions(user.id,),
    };
}
```

### セキュリティヘッダー

```typescript
// middleware.ts
export function securityHeaders(request: NextRequest,) {
    const response = NextResponse.next();

    response.headers.set('X-Frame-Options', 'DENY',);
    response.headers.set('X-Content-Type-Options', 'nosniff',);
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin',);
    response.headers.set(
        'Content-Security-Policy',
        'default-src \'self\'; script-src \'self\' \'unsafe-inline\' https://clerk.com; style-src \'self\' \'unsafe-inline\';',
    );

    return response;
}
```

## プライバシー・GDPR 対応

### データ保護

- **データ最小化**: 必要最小限の個人情報のみ収集
- **暗号化**: 個人情報の暗号化保存
- **アクセスログ**: 個人情報アクセスの監査ログ

### ユーザー権利

```typescript
interface PrivacyRights {
    dataAccess(): Promise<UserDataExport>; // データ取得権
    dataPortability(): Promise<ExportFile>; // データポータビリティ権
    dataRectification(updates: Partial<UserProfile>,): Promise<void>; // 訂正権
    dataErasure(): Promise<void>; // 削除権（忘れられる権利）
    processingRestriction(): Promise<void>; // 処理制限権
}
```

### データ削除

```typescript
async function deleteUserData(userId: string,): Promise<void> {
    // 1. 関連データの削除
    await Promise.all([
        deleteUserConversations(userId,),
        deleteUserDocuments(userId,),
        deleteUserSessions(userId,),
        deleteUserActivity(userId,),
    ],);

    // 2. Vector DB からの削除
    await deleteUserVectorData(userId,);

    // 3. ファイルストレージからの削除
    await deleteUserFiles(userId,);

    // 4. ユーザーアカウントの削除
    await deleteUser(userId,);

    // 5. Clerk からの削除
    await clerkClient.users.deleteUser(clerkId,);
}
```

## 監視・ログ

### 認証イベント監視

```typescript
interface AuthEvent {
    eventType:
        | 'login'
        | 'logout'
        | 'token_refresh'
        | 'access_denied'
        | 'suspicious_activity';
    userId?: string;
    sessionId?: string;
    ipAddress: string;
    userAgent: string;
    location?: GeoLocation;
    metadata: Record<string, any>;
    timestamp: Date;
}

// 不審なアクティビティの検出
interface SuspiciousActivityDetector {
    checkMultipleFailedLogins(userId: string,): Promise<boolean>;
    checkUnusualLocation(
        userId: string,
        location: GeoLocation,
    ): Promise<boolean>;
    checkDeviceFingerprint(
        userId: string,
        deviceInfo: DeviceInfo,
    ): Promise<boolean>;
}
```

### セキュリティアラート

- **複数ログイン失敗**: 15分間に5回以上の失敗
- **異常な地理的位置**: 前回ログインから1000km以上の移動
- **新規デバイス**: 未知のデバイスからのアクセス
- **権限昇格**: 管理者権限への不正アクセス試行

## テスト仕様

### 認証テスト

```typescript
describe('Authentication', () => {
    test('Valid JWT token authentication', async () => {
        const token = await generateValidJWT(testUser,);
        const result = await authenticateRequest(
            createRequestWithToken(token,),
        );
        expect(result.user.id,).toBe(testUser.id,);
    });

    test('Expired token rejection', async () => {
        const expiredToken = await generateExpiredJWT(testUser,);
        await expect(
            authenticateRequest(createRequestWithToken(expiredToken,),),
        ).rejects.toThrow(UnauthorizedError,);
    });

    test('Role-based access control', async () => {
        const userToken = await generateJWT(normalUser,);
        await expect(
            requireRole(UserRole.ADMIN,)(createRequestWithToken(userToken,),),
        ).rejects.toThrow(ForbiddenError,);
    });
});
```

### セキュリティテスト

- **JWT 改ざん検証**: トークン署名の検証
- **セッション固定攻撃**: セッション ID の適切な更新
- **CSRF 攻撃**: トークン検証とリファラーチェック
- **ブルートフォース攻撃**: レート制限の有効性

## パフォーマンス最適化

### トークン検証最適化

- **キャッシュ**: 検証済みトークンのメモリキャッシュ（5分）
- **並列処理**: 複数リクエストの並列認証処理
- **バッチ処理**: ユーザー情報の一括取得

### セッション管理最適化

- **KV ストレージ**: アクティブセッションの高速アクセス
- **TTL 設定**: 期限切れセッションの自動削除
- **圧縮**: セッションデータの圧縮保存
