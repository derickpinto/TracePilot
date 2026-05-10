import type { Metadata } from 'next';
import { Sidebar } from '@/components/layout/sidebar';
import { Providers } from './providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
    title: 'AI Observe — Enterprise Workflow Observability',
    description: 'Real-time AI workflow observability platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
            <body className="flex h-screen overflow-hidden bg-[hsl(222,47%,5%)] font-sans text-white antialiased">
                <Providers>
                    <Sidebar />
                    <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
                </Providers>
            </body>
        </html>
    );
}
