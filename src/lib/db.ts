import { PrismaClient, } from '@prisma/client';
import { env, } from './env';

declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

/**
 * Prismaクライアントのシングルトンインスタンス
 * 開発環境では接続の再利用、本番環境では新しい接続を作成
 */
export const prisma = globalThis.__prisma ?? new PrismaClient({
    log: env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn',]
        : ['error',],
    datasources: {
        db: {
            url: env.DATABASE_URL,
        },
    },
},);

// 開発環境でのみグローバル変数に保存（ホットリロード対応）
if (env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma;
}

/**
 * データベース接続のヘルスチェック
 */
export async function checkDatabaseHealth(): Promise<{
    isHealthy: boolean;
    error?: string;
}> {
    try {
        await prisma.$connect();
        // 簡単なクエリでDB接続を確認
        await prisma.$queryRaw`SELECT 1`;
        return { isHealthy: true, };
    } catch (error) {
        console.error('Database health check failed:', error,);
        return {
            isHealthy: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * データベース接続の初期化
 * アプリケーション起動時に呼び出し
 */
export async function initializeDatabase(): Promise<void> {
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully',);
    } catch (error) {
        console.error('❌ Failed to connect to database:', error,);
        throw error;
    }
}

/**
 * データベース接続のクリーンアップ
 * アプリケーション終了時に呼び出し
 */
export async function disconnectDatabase(): Promise<void> {
    try {
        await prisma.$disconnect();
        console.log('✅ Database disconnected successfully',);
    } catch (error) {
        console.error('❌ Failed to disconnect from database:', error,);
    }
}

/**
 * システム設定を管理するユーティリティ
 */
export const systemSettings = {
    /**
     * システム設定を取得
     */
    async get(key: string,): Promise<string | null> {
        try {
            const setting = await prisma.systemSetting.findUnique({
                where: { key, },
            },);
            return setting?.value ?? null;
        } catch {
            return null;
        }
    },

    /**
     * システム設定を設定
     */
    async set(key: string, value: string,): Promise<void> {
        await prisma.systemSetting.upsert({
            where: { key, },
            update: { value, updatedAt: new Date(), },
            create: { key, value, },
        },);
    },

    /**
     * システム設定を削除
     */
    async delete(key: string,): Promise<void> {
        await prisma.systemSetting.deleteMany({
            where: { key, },
        },);
    },

    /**
     * 全システム設定を取得
     */
    async getAll(): Promise<Record<string, string>> {
        const settings = await prisma.systemSetting.findMany();
        return settings.reduce((acc, setting,) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {} as Record<string, string>,);
    },
};

/**
 * ユーザー関連のデータベース操作
 */
export const userOperations = {
    /**
     * ユーザーIDでユーザーを取得
     */
    async getById(id: string,) {
        return await prisma.user.findUnique({
            where: { id, },
            include: {
                conversations: {
                    orderBy: { updatedAt: 'desc', },
                    take: 10, // 最新10件の会話
                },
            },
        },);
    },

    /**
     * メールアドレスでユーザーを取得
     */
    async getByEmail(email: string,) {
        return await prisma.user.findUnique({
            where: { email, },
        },);
    },

    /**
     * ユーザー作成または更新（Clerk同期用）
     */
    async upsert(userData: {
        clerkId: string;
        email: string;
        displayName?: string;
        avatarUrl?: string;
    },) {
        const updateData: {
            email: string;
            updatedAt: Date;
            displayName?: string;
            avatarUrl?: string;
        } = {
            email: userData.email,
            updatedAt: new Date(),
        };

        const createData: {
            clerkId: string;
            email: string;
            displayName?: string;
            avatarUrl?: string;
        } = {
            clerkId: userData.clerkId,
            email: userData.email,
        };

        if (userData.displayName !== undefined) {
            updateData.displayName = userData.displayName;
            createData.displayName = userData.displayName;
        }

        if (userData.avatarUrl !== undefined) {
            updateData.avatarUrl = userData.avatarUrl;
            createData.avatarUrl = userData.avatarUrl;
        }

        return await prisma.user.upsert({
            where: { clerkId: userData.clerkId, },
            update: updateData,
            create: createData,
        },);
    },
};

/**
 * 会話関連のデータベース操作
 */
export const conversationOperations = {
    /**
     * ユーザーの会話一覧を取得
     */
    async getByUserId(userId: string,) {
        return await prisma.conversation.findMany({
            where: { userId, },
            orderBy: { updatedAt: 'desc', },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc', },
                    take: 1, // 最初のメッセージのみ（タイトル表示用）
                },
            },
        },);
    },

    /**
     * 会話とメッセージを作成
     */
    async create(data: {
        userId: string;
        title: string;
        initialMessage: {
            content: string;
            role: 'user' | 'assistant';
        };
    },) {
        return await prisma.conversation.create({
            data: {
                userId: data.userId,
                title: data.title,
                messages: {
                    create: {
                        content: data.initialMessage.content,
                        role: data.initialMessage.role,
                    },
                },
            },
            include: {
                messages: true,
            },
        },);
    },
};
