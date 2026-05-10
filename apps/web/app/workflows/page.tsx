'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { GitBranch } from 'lucide-react';
import Link from 'next/link';
import { TopBar } from '@/components/layout/top-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatCost, formatTokens, formatRelative } from '@/lib/format';
import { WorkflowEventStatus } from '@ai-dashboard/shared';

const ACTIVE_USECASE = 'Test UseCase';

export default function WorkflowsPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['workflows', 1, 100, ACTIVE_USECASE],
        queryFn: () => api.getWorkflows(1, 100, undefined, ACTIVE_USECASE),
        refetchInterval: 4000,
    });

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <TopBar title="Workflows" />
            <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {(data?.data ?? []).map((wf, i) => (
                            <motion.div
                                key={wf.workflowId}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                            >
                                <Link
                                    href={`/workflows/${encodeURIComponent(wf.workflowId)}`}
                                    className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3.5 transition-all hover:border-brand-600/30 hover:bg-brand-600/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <StatusBadge status={wf.latestStatus as WorkflowEventStatus} />
                                        <div>
                                            <p className="font-mono text-sm text-white/80">{wf.workflowId}</p>
                                            <p className="text-xs text-white/30">
                                                {wf.steps.length} steps · {wf.transactionIds.length} transaction{wf.transactionIds.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-xs text-white/40">
                                        <span>{formatCost(wf.totalCost)}</span>
                                        <span>{formatTokens(wf.totalTokenUsage)}</span>
                                        <span className="text-right">{formatRelative(wf.updatedAt)}</span>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                        {data?.data.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <GitBranch className="mb-3 h-10 w-10 text-white/20" />
                                <p className="text-sm text-white/30">No workflows received yet</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
