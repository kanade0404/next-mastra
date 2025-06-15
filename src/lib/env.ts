import { z } from 'zod';

/**
 * 環境変数バリデーションスキーマ
 *
 * 全ての必要な環境変数を定義し、型安全性とランタイムバリデーションを提供
 */
const envSchema = z.object({
    // =======================
    // Next.js Configuration
    // =======================
    NODE_ENV: z
        .enum(['development', 'production', 'test'])
        .default('development'),
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

    // =======================
    // Cloudflare Configuration
    // =======================
    CLOUDFLARE_ACCOUNT_ID: z
        .string()
        .min(1, 'Cloudflare Account ID is required'),

    // Cloudflare D1 Database
    DATABASE_URL: z.string().min(1, 'Database URL is required'),
    CLOUDFLARE_D1_DATABASE_ID: z.string().min(1, 'D1 Database ID is required'),

    // Cloudflare R2 Storage
    CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1, 'R2 Bucket name is required'),
    CLOUDFLARE_R2_ACCESS_KEY_ID: z
        .string()
        .min(1, 'R2 Access Key ID is required'),
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: z
        .string()
        .min(1, 'R2 Secret Access Key is required'),
    CLOUDFLARE_R2_ENDPOINT: z.string().url('R2 Endpoint must be a valid URL'),

    // Cloudflare KV Storage
    CLOUDFLARE_KV_NAMESPACE_ID: z
        .string()
        .min(1, 'KV Namespace ID is required'),
    CLOUDFLARE_KV_PREVIEW_ID: z.string().optional(),

    // Cloudflare Analytics Engine
    CLOUDFLARE_ANALYTICS_ENGINE_DATASET: z
        .string()
        .min(1, 'Analytics Engine Dataset is required'),

    // Cloudflare API Token
    CLOUDFLARE_API_TOKEN: z.string().min(1, 'Cloudflare API Token is required'),

    // =======================
    // Authentication (Clerk)
    // =======================
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
        .string()
        .min(1, 'Clerk Publishable Key is required'),
    CLERK_SECRET_KEY: z.string().min(1, 'Clerk Secret Key is required'),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
    NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL: z
        .string()
        .default('/dashboard'),
    NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL: z
        .string()
        .default('/dashboard'),

    // =======================
    // OpenAI API
    // =======================
    OPENAI_API_KEY: z.string().min(1, 'OpenAI API Key is required'),
    OPENAI_ORGANIZATION_ID: z.string().optional(),

    // =======================
    // Pinecone Vector Database
    // =======================
    PINECONE_API_KEY: z.string().min(1, 'Pinecone API Key is required'),
    PINECONE_ENVIRONMENT: z.string().min(1, 'Pinecone Environment is required'),
    PINECONE_INDEX_NAME: z.string().min(1, 'Pinecone Index Name is required'),

    // =======================
    // Brevo Email Service
    // =======================
    BREVO_API_KEY: z.string().min(1, 'Brevo API Key is required'),
    BREVO_SENDER_EMAIL: z.string().email('Brevo Sender Email must be valid'),
    BREVO_SENDER_NAME: z.string().default('Next Mastra Chat'),

    // =======================
    // Error Monitoring (Sentry)
    // =======================
    SENTRY_DSN: z.string().url('Sentry DSN must be a valid URL'),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),

    // =======================
    // Observability (OpenTelemetry)
    // =======================
    GRAFANA_CLOUD_ENDPOINT: z
        .string()
        .url('Grafana Cloud Endpoint must be a valid URL')
        .optional(),
    GRAFANA_CLOUD_API_KEY: z.string().optional(),
    GRAFANA_CLOUD_INSTANCE_ID: z.string().optional(),

    OTEL_SERVICE_NAME: z.string().default('next-mastra-chat'),
    OTEL_SERVICE_VERSION: z.string().default('1.0.0'),
    OTEL_RESOURCE_ATTRIBUTES: z.string().optional(),

    // =======================
    // MCP (Model Context Protocol) Servers
    // =======================
    MCP_FILESYSTEM_ROOT_PATH: z.string().default('/tmp/mcp'),
    MCP_FETCH_USER_AGENT: z.string().default('NextMastraBot/1.0'),
    MCP_SERVERS_CONFIG_PATH: z.string().default('./mcp-servers.json'),

    // =======================
    // Development & Testing
    // =======================
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    ENABLE_ANALYTICS: z
        .string()
        .transform((val) => val === 'true')
        .default('true'),
    ENABLE_ERROR_REPORTING: z
        .string()
        .transform((val) => val === 'true')
        .default('true'),

    // Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: z
        .string()
        .transform(Number)
        .pipe(z.number().min(1))
        .default('60'),
    RATE_LIMIT_BURST_SIZE: z
        .string()
        .transform(Number)
        .pipe(z.number().min(1))
        .default('10'),

    // Security
    CSRF_SECRET: z
        .string()
        .min(32, 'CSRF Secret must be at least 32 characters'),
    ENCRYPTION_KEY: z
        .string()
        .min(32, 'Encryption Key must be at least 32 characters'),

    // =======================
    // Optional: Development
    // =======================
    NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
    SKIP_ENV_VALIDATION: z
        .string()
        .transform((val) => val === 'true')
        .default('false'),
});

/**
 * 環境変数の型定義
 */
export type Env = z.infer<typeof envSchema>;

/**
 * 環境変数のバリデーション実行
 */
function validateEnv(): Env {
    // 環境変数バリデーションをスキップする場合
    if (process.env.SKIP_ENV_VALIDATION === 'true') {
        console.warn('⚠️  環境変数バリデーションがスキップされました');
        return process.env as unknown as Env;
    }

    try {
        const validatedEnv = envSchema.parse(process.env);
        console.warn('✅ 環境変数バリデーションが完了しました');
        return validatedEnv;
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map((err) => {
                const path = err.path.join('.');
                return `  - ${path}: ${err.message}`;
            });

            console.error('❌ 環境変数バリデーションエラー:');
            console.error(errorMessages.join('\n'));
            console.error('\n💡 設定方法:');
            console.error(
                '1. .env.local.example をコピーして .env.local を作成'
            );
            console.error('2. 必要な環境変数を設定');
            console.error('3. 各サービスのAPIキーを取得して設定\n');

            throw new Error(
                '環境変数の設定が不正です。上記のエラーを修正してください。'
            );
        }
        throw error;
    }
}

/**
 * バリデーション済み環境変数
 *
 * アプリケーション全体でこの変数を使用して、型安全な環境変数アクセスを行う
 */
export const env = validateEnv();

/**
 * 開発環境かどうかの判定
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * 本番環境かどうかの判定
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * テスト環境かどうかの判定
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * クライアントサイドで使用可能な環境変数
 *
 * NEXT_PUBLIC_ プレフィックスを持つ変数のみ
 */
export const clientEnv = {
    APP_URL: env.NEXT_PUBLIC_APP_URL,
    CLERK_PUBLISHABLE_KEY: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SIGN_IN_URL: env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    CLERK_SIGN_UP_URL: env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    CLERK_SIGN_IN_FORCE_REDIRECT_URL:
        env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL,
    CLERK_SIGN_UP_FORCE_REDIRECT_URL:
        env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL,
    VERCEL_URL: env.NEXT_PUBLIC_VERCEL_URL,
} as const;

/**
 * 環境変数の設定状況を確認する関数
 */
export function checkEnvHealth(): boolean {
    const requiredKeys = [
        'CLOUDFLARE_ACCOUNT_ID',
        'DATABASE_URL',
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        'CLERK_SECRET_KEY',
        'OPENAI_API_KEY',
        'PINECONE_API_KEY',
    ] as const;

    // eslint-disable-next-line security/detect-object-injection
    const missing = requiredKeys.filter((key) => !env[key]);

    if (missing.length > 0) {
        console.warn('⚠️  以下の重要な環境変数が設定されていません:');
        missing.forEach((key) => console.warn(`  - ${key}`));
        return false;
    }

    console.warn('✅ 重要な環境変数がすべて設定されています');
    return true;
}

/**
 * エラーハンドリング付きの環境変数取得
 */
export function getEnvVar(key: keyof Env, fallback?: string): string {
    // eslint-disable-next-line security/detect-object-injection
    const value = env[key];

    if (!value) {
        if (fallback !== undefined) {
            console.warn(
                `⚠️  環境変数 ${key} が設定されていません。フォールバック値を使用: ${fallback}`
            );
            return fallback;
        }
        throw new Error(`環境変数 ${key} が設定されていません`);
    }

    return String(value);
}
