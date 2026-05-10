import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatTimestamp(iso: string): string {
    try {
        return format(parseISO(iso), 'MMM dd, HH:mm:ss');
    } catch {
        return iso;
    }
}

export function formatRelative(iso: string): string {
    try {
        return formatDistanceToNow(parseISO(iso), { addSuffix: true });
    } catch {
        return iso;
    }
}

export function formatDuration(ms?: number): string {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}

export function formatTokens(n?: number): string {
    if (!n) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}

export function formatCost(cost?: number): string {
    if (!cost) return '—';
    return `$${cost.toFixed(4)}`;
}
