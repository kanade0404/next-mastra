# 品質ゲート・テスト実装ガイドライン

## 概要

すべての実装タスクでは、コード品質とプロダクション準備を保証するため、以下の品質ゲートを必須とします。

## 必須品質ゲート

### 1. テストの実装と実行

```bash
pnpm test
```

- **要件**: 実装した機能のテストコードが含まれること
- **カバレッジ**: 新規実装部分は80%以上のテストカバレッジ
- **テスト種別**: ユニットテスト・統合テスト・E2Eテストを適切に実装

### 2. リント（コード品質）チェック

```bash
pnpm lint
```

- **要件**: ESLint ルールに完全準拠
- **対象**: TypeScript、React、セキュリティ、関数型プログラミング規約
- **自動修正**: `pnpm format` で修正可能な問題は事前に解決

### 3. 型チェック

```bash
pnpm type-check
```

- **要件**: TypeScript の厳格な型チェックにパス
- **設定**: `strict: true` + 追加の厳格設定
- **型安全性**: `any` 型の使用禁止、適切な型定義の実装

### 4. ビルド成功

```bash
pnpm build
```

- **要件**: プロダクションビルドが成功すること
- **最適化**: バンドルサイズ・パフォーマンスの確認
- **互換性**: Cloudflare Pages/Functions との互換性確認

### 5. 包括的バリデーション

```bash
pnpm validate
```

上記すべての品質ゲートを一括実行するコマンド

## テスト実装ガイドライン

### ユニットテスト

```typescript
// src/lib/example.test.ts
import { describe, it, expect } from 'vitest';
import { exampleFunction } from './example';

describe('exampleFunction', () => {
    it('正常なケースで期待される結果を返す', () => {
        const result = exampleFunction('valid input');
        expect(result).toBe('expected output');
    });

    it('不正な入力でエラーを投げる', () => {
        expect(() => exampleFunction('')).toThrow('Input cannot be empty');
    });

    it('エッジケースを適切に処理する', () => {
        const result = exampleFunction('edge case');
        expect(result).toMatchObject({
            success: true,
            data: expect.any(String),
        });
    });
});
```

### API 統合テスト

```typescript
// src/app/api/v1/example/route.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { testClient } from '@/lib/test/client';

describe('GET /api/v1/example', () => {
    beforeEach(async () => {
        await setupTestDatabase();
    });

    it('認証済みユーザーが正常なレスポンスを受け取る', async () => {
        const response = await testClient
            .get('/api/v1/example')
            .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
    });

    it('未認証ユーザーが401エラーを受け取る', async () => {
        const response = await testClient.get('/api/v1/example');

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
});
```

### コンポーネントテスト

```typescript
// src/components/ExampleComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExampleComponent } from './ExampleComponent';

describe('ExampleComponent', () => {
  it('プロパティが正しく表示される', () => {
    render(<ExampleComponent title="Test Title" />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('ボタンクリックで適切なイベントが発生する', () => {
    const handleClick = vi.fn();
    render(<ExampleComponent onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### E2Eテスト（Playwright）

```typescript
// tests/e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('チャット機能', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('[data-testid="login-button"]');
        // 認証フローの完了を待機
    });

    test('新しいメッセージを送信できる', async ({ page }) => {
        await page.fill('[data-testid="message-input"]', 'Hello, AI!');
        await page.click('[data-testid="send-button"]');

        await expect(
            page.locator('[data-testid="message"]').last()
        ).toContainText('Hello, AI!');
        await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();
    });
});
```

## テスト環境設定

### Vitest 設定 (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.d.ts',
                '**/*.config.*',
            ],
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80,
                },
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
});
```

### テストセットアップ (src/test/setup.ts)

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// モック設定
vi.mock('@clerk/nextjs', () => ({
    useAuth: () => ({
        isSignedIn: true,
        userId: 'test-user-id',
    }),
    ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// 環境変数のモック
vi.mock('@/lib/env', () => ({
    env: {
        OPENAI_API_KEY: 'test-api-key',
        PINECONE_API_KEY: 'test-pinecone-key',
        DATABASE_URL: 'file:./test.db',
    },
}));

// グローバルfetchのモック
global.fetch = vi.fn();
```

## モック戦略

### 外部APIのモック

```typescript
// src/test/mocks/openai.ts
import { vi } from 'vitest';

export const mockOpenAI = {
    chat: {
        completions: {
            create: vi.fn().mockResolvedValue({
                choices: [
                    {
                        message: {
                            content: 'Mocked AI response',
                        },
                    },
                ],
            }),
        },
    },
    embeddings: {
        create: vi.fn().mockResolvedValue({
            data: [
                {
                    embedding: new Array(1536).fill(0.1),
                },
            ],
        }),
    },
};
```

### データベースのモック

```typescript
// src/test/mocks/database.ts
import { vi } from 'vitest';

export const mockPrisma = {
    user: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    conversation: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
};
```

## 継続的品質保証

### pre-commit フック (lefthook.yml)

```yaml
pre-commit:
    parallel: true
    commands:
        validate:
            run: pnpm validate
            fail_text: '品質ゲートが失敗しました。エラーを修正してから再コミットしてください。'
```

### CI/CD パイプライン

```yaml
# .github/workflows/quality-check.yml
name: Quality Gates

on: [push, pull_request]

jobs:
    quality-check:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: '18'
                  cache: 'pnpm'

            - run: pnpm install
            - run: pnpm validate
            - run: pnpm test:coverage

            - name: Upload coverage reports
              uses: codecov/codecov-action@v3
```

## デバッグ・トラブルシューティング

### よくある問題と解決法

#### 1. 型エラー

```bash
# 型定義の再生成
pnpm db:generate

# キャッシュクリア
rm -rf .next node_modules/.cache
pnpm install
```

#### 2. テスト失敗

```bash
# 詳細ログでテスト実行
pnpm test --reporter=verbose

# 特定テストのみ実行
pnpm test src/path/to/test.ts
```

#### 3. リント エラー

```bash
# 自動修正可能な問題を修正
pnpm format

# 詳細なリントレポート
pnpm lint:eslint --format=detailed
```

## 品質メトリクス

### 目標値

- **テストカバレッジ**: 80%以上
- **型安全性**: TypeScript strict mode 100%準拠
- **リント違反**: 0件
- **ビルド成功率**: 100%
- **パフォーマンス**: Core Web Vitals 基準クリア

### 監視方法

- **自動化**: CI/CD パイプラインでの継続監視
- **レポート**: 品質メトリクスの定期レポート
- **アラート**: 品質低下時の即座通知
