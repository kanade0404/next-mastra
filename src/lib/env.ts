import { z, } from 'zod';

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
        .enum(['development', 'production', 'test',],)
        .default('development',),
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000',),

    // =======================
    // Cloudflare Configuration
    // =======================
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),

    // Cloudflare D1 Database
    DATABASE_URL: z.string().min(1, 'Database URL is required',),
    CLOUDFLARE_D1_DATABASE_ID: z.string().optional(),
    CLOUDFLARE_D1_TOKEN: z.string().optional(),

    // Cloudflare R2 Storage
    CLOUDFLARE_R2_BUCKET_NAME: z.string().optional(),
    CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
    CLOUDFLARE_R2_ENDPOINT: z.string().optional(),

    // Cloudflare KV Storage
    CLOUDFLARE_KV_NAMESPACE_ID: z.string().optional(),

    // Cloudflare Analytics
    CLOUDFLARE_ANALYTICS_TOKEN: z.string().optional(),
    CLOUDFLARE_ZONE_ID: z.string().optional(),

    // Cloudflare API Token
    CLOUDFLARE_API_TOKEN: z.string().optional(),

    // =======================
    // Authentication (Clerk)
    // =======================
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
    CLERK_SECRET_KEY: z.string().optional(),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in',),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up',),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/dashboard',),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/dashboard',),
    CLERK_JWT_KEY: z.string().optional(),
    CLERK_WEBHOOK_SECRET: z.string().optional(),

    // =======================
    // AI/LLM設定
    // =======================
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4',),
    OPENAI_MAX_TOKENS: z
        .string()
        .transform(Number,)
        .pipe(z.number().min(1,),)
        .default('4000',),
    OPENAI_TEMPERATURE: z
        .string()
        .transform(Number,)
        .pipe(z.number().min(0,).max(2,),)
        .default('0.7',),
    OPENAI_ORGANIZATION_ID: z.string().optional(),

    // =======================
    // ベクトル検索設定 (Pinecone)
    // =======================
    PINECONE_API_KEY: z.string().optional(),
    PINECONE_ENVIRONMENT: z.string().optional(),
    PINECONE_INDEX_NAME: z.string().optional(),

    // =======================
    // メール設定 (Brevo)
    // =======================
    BREVO_API_KEY: z.string().optional(),
    BREVO_SENDER_EMAIL: z.string().optional(),
    BREVO_SENDER_NAME: z.string().default('Next Mastra App',),
    BREVO_WELCOME_TEMPLATE_ID: z
        .string()
        .transform(Number,)
        .pipe(z.number().min(1,),)
        .optional(),
    BREVO_ALERT_TEMPLATE_ID: z
        .string()
        .transform(Number,)
        .pipe(z.number().min(1,),)
        .optional(),

    // =======================
    // 監視・ログ設定
    // =======================
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),

    // =======================
    // OpenTelemetry設定
    // =======================
    OTEL_SERVICE_NAME: z.string().default('next-mastra',),
    OTEL_SERVICE_VERSION: z.string().default('1.0.0',),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),

    // =======================
    // セキュリティ設定
    // =======================
    JWT_SECRET: z.string().optional(),
    SESSION_SECRET: z.string().optional(),
    CSRF_SECRET: z.string().optional(),

    // API レート制限設定
    RATE_LIMIT_MAX_REQUESTS: z
        .string()
        .transform(Number,)
        .pipe(z.number().min(1,),)
        .default('100',),
    RATE_LIMIT_WINDOW_MS: z
        .string()
        .transform(Number,)
        .pipe(z.number().min(1,),)
        .default('900000',),

    // =======================
    // MCP (Model Context Protocol) サーバー設定
    // =======================
    MCP_FILESYSTEM_ROOT_PATH: z.string().default('./data',),
    MCP_FILESYSTEM_MAX_FILE_SIZE: z
        .string()
        .transform(Number,)
        .pipe(z.number().min(1,),)
        .default('5242880',),
    MCP_FILESYSTEM_ALLOWED_EXTENSIONS: z
        .string()
        .default('.txt,.md,.json,.csv,.log',),

    MCP_FETCH_USER_AGENT: z.string().default('NextMastraBot/1.0',),
    MCP_FETCH_TIMEOUT: z
        .string()
        .transform(Number,)
        .pipe(z.number().min(1,),)
        .default('10000',),
    MCP_FETCH_MAX_SIZE: z
        .string()
        .transform(Number,)
        .pipe(z.number().min(1,),)
        .default('1048576',),

    // MCP外部データベース設定
    MCP_AIVEN_POSTGRES_URL: z.string().optional(),
    MCP_AIVEN_API_TOKEN: z.string().optional(),
    MCP_CLICKHOUSE_URL: z.string().optional(),
    MCP_CLICKHOUSE_USER: z.string().optional(),
    MCP_CLICKHOUSE_PASSWORD: z.string().optional(),
    MCP_CLICKHOUSE_DATABASE: z.string().optional(),
    MCP_DEBUGGING_API_KEY: z.string().optional(),
    MCP_DEBUGGING_PROJECT_ID: z.string().optional(),

    // =======================
    // 開発・テスト設定
    // =======================
    TEST_DATABASE_URL: z.string().optional(),
    TEST_CLERK_PUBLISHABLE_KEY: z.string().optional(),
    TEST_CLERK_SECRET_KEY: z.string().optional(),
    DEBUG: z
        .preprocess((v,) => v === 'true', z.boolean(),)
        .default(false,),
    VERBOSE_LOGGING: z
        .preprocess((v,) => v === 'true', z.boolean(),)
        .default(false,),
    LOG_LEVEL: z
        .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace',],)
        .default('info',),

    // =======================
    // パフォーマンス・キャッシュ設定
    // =======================
    REDIS_URL: z.string().optional(),
    REDIS_PASSWORD: z.string().optional(),
    CACHE_TTL: z
        .string()
        .transform(Number,)
        .pipe(z.number().min(1,),)
        .default('3600',),
    CACHE_MAX_SIZE: z
        .string()
        .transform(Number,)
        .pipe(z.number().min(1,),)
        .default('100',),

    // =======================
    // 外部API設定
    // =======================
    GITHUB_TOKEN: z.string().optional(),
    SLACK_WEBHOOK_URL: z.string().optional(),

    // =======================
    // Optional: Development
    // =======================
    NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
    SKIP_ENV_VALIDATION: z
        .preprocess((v,) => v === 'true', z.boolean(),)
        .default(false,),
},);

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
        console.warn('⚠️  環境変数バリデーションがスキップされました',);
        return process.env as unknown as Env;
    }

    try {
        const validatedEnv = envSchema.parse(process.env,);
        console.warn('✅ 環境変数バリデーションが完了しました',);
        return validatedEnv;
    } catch (error) {
        // ビルド時は警告のみ表示してデフォルト値を使用
        if (
            process.env.NODE_ENV === 'production'
            || process.env.NEXT_PHASE === 'phase-production-build'
        ) {
            console.warn(
                '⚠️  環境変数の一部が未設定です。デフォルト値を使用します。',
            );
            return envSchema.parse({
                ...process.env,
                NODE_ENV: process.env.NODE_ENV || 'production',
                NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
                    || 'http://localhost:3000',
                DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
            },);
        }

        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map((err,) => {
                const path = err.path.join('.',);
                return `  - ${path}: ${err.message}`;
            },);

            console.error('❌ 環境変数バリデーションエラー:',);
            console.error(errorMessages.join('\n',),);
            console.error('\n💡 設定方法:',);
            console.error(
                '1. .env.local.example をコピーして .env.local を作成',
            );
            console.error('2. 必要な環境変数を設定',);
            console.error('3. 各サービスのAPIキーを取得して設定\n',);

            throw new Error(
                '環境変数の設定が不正です。上記のエラーを修正してください。',
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
    CLERK_AFTER_SIGN_IN_URL: env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    CLERK_AFTER_SIGN_UP_URL: env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
    SENTRY_DSN: env.NEXT_PUBLIC_SENTRY_DSN,
    VERCEL_URL: env.NEXT_PUBLIC_VERCEL_URL,
} as const;

/**
 * 環境変数の設定状況を確認する関数
 */
export function checkEnvHealth(): {
    isHealthy: boolean;
    missing: string[];
    warnings: string[];
} {
    const criticalKeys = ['DATABASE_URL',] as const;

    const importantKeys = [
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        'CLERK_SECRET_KEY',
        'OPENAI_API_KEY',
    ] as const;

    const optionalKeys = [
        'PINECONE_API_KEY',
        'BREVO_API_KEY',
        'NEXT_PUBLIC_SENTRY_DSN',
        'CLOUDFLARE_ACCOUNT_ID',
    ] as const;

    const missing = criticalKeys.filter((key,) => !env[key]);
    const warnings = [
        ...importantKeys.filter((key,) => !env[key]),
        ...optionalKeys.filter((key,) => !env[key]),
    ];

    const isHealthy = missing.length === 0;

    if (!isHealthy) {
        console.error('❌ 以下の必須環境変数が設定されていません:',);
        missing.forEach((key,) => console.error(`  - ${key}`,));
    }

    if (warnings.length > 0) {
        console.warn('⚠️  以下の推奨環境変数が設定されていません:',);
        warnings.forEach((key,) => console.warn(`  - ${key}`,));
    }

    if (isHealthy && warnings.length === 0) {
        console.warn('✅ すべての環境変数が設定されています',);
    }

    return { isHealthy, missing, warnings, };
}

/**
 * エラーハンドリング付きの環境変数取得
 */
export function getEnvVar(key: keyof Env, fallback?: string,): string {
    // eslint-disable-next-line security/detect-object-injection
    const value = env[key];

    if (!value) {
        if (fallback !== undefined) {
            console.warn(
                `⚠️  環境変数 ${key} が設定されていません。フォールバック値を使用: ${fallback}`,
            );
            return fallback;
        }
        throw new Error(`環境変数 ${key} が設定されていません`,);
    }

    return String(value,);
}
