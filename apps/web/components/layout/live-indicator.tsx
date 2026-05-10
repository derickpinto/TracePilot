'use client';

import { useWorkflowStore } from '@/store/workflow-store';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff } from 'lucide-react';

export function LiveIndicator() {
    const connected = useWorkflowStore((s) => s.wsConnected);
    return (
        <div
            className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
                connected
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400',
            )}
        >
            {connected ? (
                <>
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    <Wifi className="h-3 w-3" />
                    <span>Live</span>
                </>
            ) : (
                <>
                    <WifiOff className="h-3 w-3" />
                    <span>Disconnected</span>
                </>
            )}
        </div>
    );
}
