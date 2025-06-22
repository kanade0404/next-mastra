import type { Metadata, } from 'next';
import { Geist, Geist_Mono, } from 'next/font/google';
import { AuthProvider, } from '../components/providers/auth-provider';
import './globals.css';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin',],
},);

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin',],
},);

export const metadata: Metadata = {
    title: 'Next Mastra - Chat LLM Template',
    description: 'Chat LLM application built with Next.js and Mastra',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>,) {
    return (
        <html lang='ja'>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
