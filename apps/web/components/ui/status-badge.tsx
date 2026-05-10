import { WorkflowEventStatus } from '@ai-dashboard/shared';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<
    WorkflowEventStatus,
    { label: string; dot: string; bg: string; text: string }
> = {
    pending: { label: 'Pending', dot: 'bg-amber-400', bg: 'bg-amber-400/10', text: 'text-amber-400' },
    running: { label: 'Running', dot: 'bg-blue-400 animate-pulse', bg: 'bg-blue-400/10', text: 'text-blue-400' },
    completed: { label: 'Completed', dot: 'bg-emerald-400', bg: 'bg-emerald-400/10', text: 'text-emerald-400' },
    failed: { label: 'Failed', dot: 'bg-red-400', bg: 'bg-red-400/10', text: 'text-red-400' },
    retry: { label: 'Retry', dot: 'bg-orange-400', bg: 'bg-orange-400/10', text: 'text-orange-400' },
    approved: { label: 'Approved', dot: 'bg-violet-400', bg: 'bg-violet-400/10', text: 'text-violet-400' },
    rejected: { label: 'Rejected', dot: 'bg-pink-400', bg: 'bg-pink-400/10', text: 'text-pink-400' },
};

interface StatusBadgeProps {
    status: WorkflowEventStatus;
    className?: string;
    showDot?: boolean;
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                config.bg,
                config.text,
                className,
            )}
        >
            {showDot && <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />}
            {config.label}
        </span>
    );
}
