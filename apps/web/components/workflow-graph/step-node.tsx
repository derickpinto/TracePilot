'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { StatusBadge } from '@/components/ui/status-badge';
import { WorkflowEventStatus } from '@ai-dashboard/shared';
import { formatDuration, formatTokens } from '@/lib/format';

interface StepNodeData {
    step: string;
    status: WorkflowEventStatus;
    durationMs?: number;
    tokenUsage?: number;
    count: number;
    [key: string]: unknown;
}

export const StepNode = memo(({ data }: { data: StepNodeData }) => {
    return (
        <div className="min-w-[160px] rounded-xl border border-white/[0.1] bg-[hsl(222,40%,9%)] p-3 shadow-lg">
            <Handle type="target" position={Position.Left} className="!border-white/20 !bg-white/10" />

            <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-white/90">{data.step}</span>
                <StatusBadge status={data.status} showDot={false} className="text-[10px]" />
            </div>

            <div className="flex items-center gap-3 text-[10px] text-white/40">
                {data.durationMs != null && (
                    <span title="Duration">{formatDuration(data.durationMs)}</span>
                )}
                {data.tokenUsage != null && data.tokenUsage > 0 && (
                    <span title="Tokens">{formatTokens(data.tokenUsage)} tok</span>
                )}
                {data.count > 1 && (
                    <span title="Occurrences">×{data.count}</span>
                )}
            </div>

            <Handle type="source" position={Position.Right} className="!border-white/20 !bg-white/10" />
        </div>
    );
});

StepNode.displayName = 'StepNode';
