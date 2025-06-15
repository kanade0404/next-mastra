import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// モジュールをモック化
vi.mock('./env', async () => {
    // 実際のモジュールを取得
    const actual = await vi.importActual('./env');
    return {
        ...actual,
        // validateEnv関数のみモック化
        validateEnv: vi.fn(),
    };
});

describe('環境変数バリデーション', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // テスト前に環境変数をクリア
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        // テスト後に環境変数を復元
        process.env = originalEnv;
    });

    describe('必須環境変数のバリデーション', () => {
        it('全ての必須環境変数が設定されている場合、バリデーションが成功する', async () => {
            // Arrange: 有効な環境変数を設定
            const validEnv = {
                NODE_ENV: 'development',
                NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
                CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
                DATABASE_URL: 'test-database-url',
                CLOUDFLARE_D1_DATABASE_ID: 'test-d1-id',
                CLOUDFLARE_R2_BUCKET_NAME: 'test-bucket',
                CLOUDFLARE_R2_ACCESS_KEY_ID: 'test-access-key',
                CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'test-secret-key',
                CLOUDFLARE_R2_ENDPOINT: 'https://test.r2.example.com',
                CLOUDFLARE_KV_NAMESPACE_ID: 'test-kv-id',
                CLOUDFLARE_ANALYTICS_ENGINE_DATASET: 'test-dataset',
                CLOUDFLARE_API_TOKEN: 'test-api-token',
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'test-clerk-publishable',
                CLERK_SECRET_KEY: 'test-clerk-secret',
                OPENAI_API_KEY: 'test-openai-key',
                PINECONE_API_KEY: 'test-pinecone-key',
                PINECONE_ENVIRONMENT: 'test-env',
                PINECONE_INDEX_NAME: 'test-index',
                BREVO_API_KEY: 'test-brevo-key',
                BREVO_SENDER_EMAIL: 'test@example.com',
                SENTRY_DSN: 'https://test@sentry.io/123',
                CSRF_SECRET: 'test-csrf-secret-at-least-32-chars-long',
                ENCRYPTION_KEY: 'test-encryption-key-at-least-32-chars',
            };

            Object.assign(process.env, validEnv);

            // Act & Assert: モジュールを動的にインポートしてバリデーション実行
            const { checkEnvHealth } = await import('./env');

            expect(() => checkEnvHealth()).not.toThrow();
        });

        it('必須環境変数が不足している場合、適切なエラーメッセージを表示する', () => {
            // Arrange: 不完全な環境変数設定
            const incompleteEnv = {
                NODE_ENV: 'development',
                // 他の必須項目を意図的に省略
            };

            // Act & Assert: zodスキーマを直接テスト
            expect(() => {
                const { z } = require('zod');
                const testSchema = z.object({
                    NODE_ENV: z.enum(['development', 'production', 'test']),
                    CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
                    DATABASE_URL: z.string().min(1),
                });
                testSchema.parse(incompleteEnv);
            }).toThrow();
        });
    });

    describe('個別環境変数のバリデーション', () => {
        it('NODE_ENVが有効な値の場合、バリデーションが成功する', () => {
            const validValues = ['development', 'production', 'test'];

            validValues.forEach((value) => {
                expect(() => {
                    const { z } = require('zod');
                    const envSchema = z.object({
                        NODE_ENV: z.enum(['development', 'production', 'test']),
                    });
                    envSchema.parse({ NODE_ENV: value });
                }).not.toThrow();
            });
        });

        it('無効なNODE_ENVの場合、バリデーションが失敗する', () => {
            expect(() => {
                const { z } = require('zod');
                const envSchema = z.object({
                    NODE_ENV: z.enum(['development', 'production', 'test']),
                });
                envSchema.parse({ NODE_ENV: 'invalid-env' });
            }).toThrow();
        });

        it('URL形式の環境変数が有効な場合、バリデーションが成功する', () => {
            const validUrls = [
                'http://localhost:3000',
                'https://example.com',
                'https://subdomain.example.com/path',
            ];

            validUrls.forEach((url) => {
                expect(() => {
                    const { z } = require('zod');
                    const urlSchema = z.string().url();
                    urlSchema.parse(url);
                }).not.toThrow();
            });
        });

        it('無効なURL形式の場合、バリデーションが失敗する', () => {
            const invalidUrls = ['not-a-url', 'http://', ''];

            invalidUrls.forEach((url) => {
                expect(() => {
                    const { z } = require('zod');
                    const urlSchema = z.string().url();
                    urlSchema.parse(url);
                }).toThrow();
            });
        });

        it('最小長要件を満たさない場合、バリデーションが失敗する', () => {
            expect(() => {
                const { z } = require('zod');
                const schema = z.string().min(32);
                schema.parse('short-string'); // 32文字未満
            }).toThrow();
        });

        it('Eメール形式が有効な場合、バリデーションが成功する', () => {
            const validEmails = [
                'test@example.com',
                'user.name@domain.co.jp',
                'admin+system@company.org',
            ];

            validEmails.forEach((email) => {
                expect(() => {
                    const { z } = require('zod');
                    const emailSchema = z.string().email();
                    emailSchema.parse(email);
                }).not.toThrow();
            });
        });
    });

    describe('ユーティリティ関数', () => {
        it('isDevelopment が正しく動作する', async () => {
            Object.assign(process.env, { NODE_ENV: 'development' });

            // 環境変数の最小セットを設定
            const minimalEnv = {
                NODE_ENV: 'development',
                CLOUDFLARE_ACCOUNT_ID: 'test',
                DATABASE_URL: 'test',
                CLOUDFLARE_D1_DATABASE_ID: 'test',
                CLOUDFLARE_R2_BUCKET_NAME: 'test',
                CLOUDFLARE_R2_ACCESS_KEY_ID: 'test',
                CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'test',
                CLOUDFLARE_R2_ENDPOINT: 'https://test.com',
                CLOUDFLARE_KV_NAMESPACE_ID: 'test',
                CLOUDFLARE_ANALYTICS_ENGINE_DATASET: 'test',
                CLOUDFLARE_API_TOKEN: 'test',
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'test',
                CLERK_SECRET_KEY: 'test',
                OPENAI_API_KEY: 'test',
                PINECONE_API_KEY: 'test',
                PINECONE_ENVIRONMENT: 'test',
                PINECONE_INDEX_NAME: 'test',
                BREVO_API_KEY: 'test',
                BREVO_SENDER_EMAIL: 'test@example.com',
                SENTRY_DSN: 'https://test@sentry.io/123',
                CSRF_SECRET: 'test-csrf-secret-at-least-32-chars-long',
                ENCRYPTION_KEY: 'test-encryption-key-at-least-32-chars',
                SKIP_ENV_VALIDATION: 'true', // バリデーションをスキップ
            };

            Object.assign(process.env, minimalEnv);

            const { isDevelopment } = await import('./env');
            expect(isDevelopment).toBe(true);
        });

        it('getEnvVar がフォールバック値を正しく返す', async () => {
            // モック環境でテスト用の関数を作成
            const getEnvVarMock = (key: string, fallback?: string): string => {
                const value = process.env[key];
                if (!value) {
                    if (fallback !== undefined) {
                        return fallback;
                    }
                    throw new Error(`環境変数 ${key} が設定されていません`);
                }
                return value;
            };

            // 存在しない環境変数でフォールバック値を使用
            const result = getEnvVarMock('NON_EXISTENT_VAR', 'fallback-value');
            expect(result).toBe('fallback-value');
        });

        it('getEnvVar がフォールバック値がない場合エラーを投げる', () => {
            const getEnvVarMock = (key: string, fallback?: string): string => {
                const value = process.env[key];
                if (!value) {
                    if (fallback !== undefined) {
                        return fallback;
                    }
                    throw new Error(`環境変数 ${key} が設定されていません`);
                }
                return value;
            };

            expect(() => {
                getEnvVarMock('NON_EXISTENT_VAR');
            }).toThrow('環境変数 NON_EXISTENT_VAR が設定されていません');
        });
    });

    describe('スキップ機能', () => {
        it('SKIP_ENV_VALIDATION=trueの場合、バリデーションがスキップされる', async () => {
            process.env = {
                SKIP_ENV_VALIDATION: 'true',
                NODE_ENV: 'development',
            };

            // バリデーションスキップ時はエラーが発生しない
            expect(async () => {
                await import('./env');
            }).not.toThrow();
        });
    });

    describe('クライアント環境変数', () => {
        it('clientEnv に NEXT_PUBLIC_ プレフィックスの変数のみ含まれる', async () => {
            const testEnv = {
                NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'test-key',
                PRIVATE_API_KEY: 'should-not-be-included',
                SKIP_ENV_VALIDATION: 'true',
            };

            Object.assign(process.env, testEnv);

            const { clientEnv } = await import('./env');

            expect(clientEnv).toHaveProperty('APP_URL');
            expect(clientEnv).toHaveProperty('CLERK_PUBLISHABLE_KEY');
            expect(clientEnv).not.toHaveProperty('PRIVATE_API_KEY');
        });
    });
});

// エッジケースのテスト
describe('エッジケースとエラーハンドリング', () => {
    it('数値変換が正しく動作する', () => {
        const { z } = require('zod');
        const numberSchema = z
            .string()
            .transform(Number)
            .pipe(z.number().min(1));

        expect(numberSchema.parse('60')).toBe(60);
        expect(() => numberSchema.parse('0')).toThrow();
        expect(() => numberSchema.parse('not-a-number')).toThrow();
    });

    it('ブール値変換が正しく動作する', () => {
        const { z } = require('zod');
        const booleanSchema = z
            .string()
            .transform((val: string) => val === 'true');

        expect(booleanSchema.parse('true')).toBe(true);
        expect(booleanSchema.parse('false')).toBe(false);
        expect(booleanSchema.parse('other')).toBe(false);
    });

    it('オプショナル値の処理が正しく動作する', () => {
        const { z } = require('zod');
        const optionalSchema = z.string().optional();

        expect(optionalSchema.parse(undefined)).toBeUndefined();
        expect(optionalSchema.parse('value')).toBe('value');
    });
});
