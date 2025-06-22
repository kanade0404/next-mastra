import { auth as clerkAuth, currentUser, } from '@clerk/nextjs/server';
import { User, } from '@clerk/nextjs/server';

/**
 * Clerk認証の型定義
 */
export type ClerkUser = User;

/**
 * 認証状態の型定義
 */
export interface AuthState {
    isSignedIn: boolean;
    user: ClerkUser | null;
    userId: string | null;
}

/**
 * 現在のユーザー認証状態を取得
 */
export async function getAuthState(): Promise<AuthState> {
    const user = await currentUser();
    const { userId, } = await clerkAuth();

    return {
        isSignedIn: !!user,
        user,
        userId,
    };
}

/**
 * 認証が必要なアクションで使用するユーザー情報取得
 */
export async function requireAuth(): Promise<{
    user: ClerkUser;
    userId: string;
}> {
    const { user, userId, isSignedIn, } = await getAuthState();

    if (!isSignedIn || !user || !userId) {
        throw new Error('Authentication required',);
    }

    return { user, userId, };
}

/**
 * ユーザーIDのみを安全に取得
 */
export async function getUserId(): Promise<string | null> {
    const { userId, } = await clerkAuth();
    return userId;
}

/**
 * 現在のユーザー情報を取得
 */
export async function getCurrentUser(): Promise<ClerkUser | null> {
    return await currentUser();
}

/**
 * ユーザーの権限チェック（基本実装）
 */
export function hasPermission(
    user: ClerkUser,
    permission: string,
): boolean {
    // 基本的な権限チェック実装
    // 実際のプロジェクトでは、より複雑な権限システムを実装
    const userMetadata = user.publicMetadata as Record<string, unknown>;
    const permissions = userMetadata.permissions as string[] | undefined;

    return permissions?.includes(permission,) ?? false;
}

/**
 * 管理者権限チェック
 */
export function isAdmin(user: ClerkUser,): boolean {
    return hasPermission(user, 'admin',);
}

/**
 * ユーザーのメタデータを安全に取得
 */
export function getUserMetadata<T = Record<string, unknown>,>(
    user: ClerkUser,
    key?: string,
): T | unknown {
    const metadata = user.publicMetadata as Record<string, unknown>;

    if (key) {
        return metadata[key];
    }

    return metadata as T;
}

/**
 * ユーザーの表示名を取得
 */
export function getDisplayName(user: ClerkUser,): string {
    return (
        user.fullName
        || user.firstName
        || user.username
        || user.emailAddresses[0]?.emailAddress
        || 'Unknown User'
    );
}

/**
 * ユーザーのプライマリメールアドレスを取得
 */
export function getPrimaryEmail(user: ClerkUser,): string | null {
    return user.emailAddresses[0]?.emailAddress ?? null;
}
