'use client';

import { LiveIndicator } from './live-indicator';

interface TopBarProps {
    title?: string;
    children?: React.ReactNode;
}

export function TopBar({ title, children }: TopBarProps) {
    return (
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/[0.06] bg-[hsl(222,47%,5%)] px-6">
            <div className="flex items-center gap-4">
                {title && (
                    <h1 className="text-sm font-medium text-white/80">{title}</h1>
                )}
                {children}
            </div>
            <LiveIndicator />
        </header>
    );
}
