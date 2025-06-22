'use client';

import { ClerkProvider, } from '@clerk/nextjs';
import { ReactNode, } from 'react';

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children, }: AuthProviderProps,): ReactNode {
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    // Clerk設定がない場合は、認証なしで子コンポーネントを直接返す
    if (!publishableKey || publishableKey === '') {
        return <>{children}</>;
    }

    return (
        <ClerkProvider
            publishableKey={publishableKey}
            signInUrl='/sign-in'
            signUpUrl='/sign-up'
            afterSignInUrl='/dashboard'
            afterSignUpUrl='/dashboard'
        >
            {children}
        </ClerkProvider>
    );
}
