'use client';

import { useWorkflowStore } from '@/store/workflow-store';
import { TopBar } from '@/components/layout/top-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatTimestamp, formatDuration, formatCost, formatTokens } from '@/lib/format';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkflowEventStatus, WorkflowState } from '@ai-dashboard/shared';
import Link from 'next/link';

export default function LiveFeedPage() {
    const workflows = useWorkflowStore((s) => s.workflows);
    const recentlyUpdated = useWorkflowStore((s) => s.recentlyUpdated);

    const sorted = Array.from(workflows.values()).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
    );

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <TopBar title="Live Feed" />
            <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence initial={false}>
                    {sorted.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-32 text-center"
                        >
                            <div className="mb-3 h-2 w-2 animate-ping rounded-full bg-brand-500" />
                            <p className="text-sm text-white/30">Listening for live events...</p>
                            <p className="mt-1 text-xs text-white/20">Events will stream here in real-time from Kafka</p>
                        </motion.div>
                    )}
                    {sorted.map((wf) => (
                        <LiveWorkflowRow
                            key={wf.workflowId}
                            workflow={wf}
                            highlighted={recentlyUpdated.has(wf.workflowId)}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

function LiveWorkflowRow({ workflow, highlighted }: { workflow: WorkflowState; highlighted: boolean }) {
    const lastStep = workflow.steps[workflow.steps.length - 1];
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className={`mb-2 rounded-lg border px-4 py-3 transition-colors ${highlighted ? 'border-brand-500/40 bg-brand-500/5' : 'border-white/[0.05] bg-white/[0.02]'
                }`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <StatusBadge status={workflow.latestStatus as WorkflowEventStatus} />
                    <Link
                        href={`/workflows/${encodeURIComponent(workflow.workflowId)}`}
                        className="truncate font-mono text-sm text-white/80 hover:text-white"
                    >
                        {workflow.workflowId}
                    </Link>
                    {lastStep && (
                        <span className="truncate text-xs text-white/30">
                            → {lastStep.step}
                        </span>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-4 text-xs text-white/40">
                    <span>{formatDuration(workflow.totalDurationMs)}</span>
                    <span>{formatTokens(workflow.totalTokenUsage)}</span>
                    <span>{formatCost(workflow.totalCost)}</span>
                    <span>{formatTimestamp(workflow.updatedAt)}</span>
                </div>
            </div>
        </motion.div>
    );
}
