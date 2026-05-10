'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { GitBranch, DollarSign, Cpu, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { TopBar } from '@/components/layout/top-bar';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useWorkflowStore } from '@/store/workflow-store';
import { formatCost, formatTokens } from '@/lib/format';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/status-badge';
import { WorkflowEventStatus } from '@ai-dashboard/shared';

const ACTIVE_USECASE = 'Test UseCase';

const STAGGER = {
    container: { animate: { transition: { staggerChildren: 0.06 } } },
    item: {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    },
};

export default function DashboardPage() {
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['stats', ACTIVE_USECASE],
        queryFn: () => api.getStats(ACTIVE_USECASE),
        refetchInterval: 5000,
    });

    const { data: workflowsPage, isLoading: wfLoading } = useQuery({
        queryKey: ['workflows', 1, 20, ACTIVE_USECASE],
        queryFn: () => api.getWorkflows(1, 20, undefined, ACTIVE_USECASE),
        refetchInterval: 5000,
    });

    const liveStats = useWorkflowStore((s) => s.stats);
    const activeStats = liveStats ?? stats;

    const kpis = [
        {
            label: 'Active Workflows',
            value: activeStats?.totalWorkflows ?? '—',
            icon: GitBranch,
            color: 'text-brand-400',
            bg: 'bg-brand-400/10',
        },
        {
            label: 'Transactions',
            value: activeStats?.totalTransactions ?? '—',
            icon: Cpu,
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
        },
        {
            label: 'Total Cost',
            value: activeStats ? formatCost(activeStats.totalCost) : '—',
            icon: DollarSign,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
        },
        {
            label: 'Total Tokens',
            value: activeStats ? formatTokens(activeStats.totalTokens) : '—',
            icon: Cpu,
            color: 'text-violet-400',
            bg: 'bg-violet-400/10',
        },
        {
            label: 'Completed',
            value: activeStats?.byStatus?.['completed'] ?? 0,
            icon: CheckCircle,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
        },
        {
            label: 'Failed',
            value: activeStats?.byStatus?.['failed'] ?? 0,
            icon: XCircle,
            color: 'text-red-400',
            bg: 'bg-red-400/10',
        },
        {
            label: 'Retries',
            value: activeStats?.byStatus?.['retry'] ?? 0,
            icon: RefreshCw,
            color: 'text-orange-400',
            bg: 'bg-orange-400/10',
        },
    ];

    return (
        <div className="flex flex-col overflow-hidden">
            <TopBar title="Dashboard" />

            <div className="flex-1 overflow-y-auto p-6">
                {/* Usecase Banner */}
                <div className="mb-6 rounded-xl border border-brand-600/30 bg-brand-600/10 px-5 py-4">
                    <p className="text-xs font-medium uppercase tracking-widest text-brand-400">Active Use Case</p>
                    <h1 className="mt-1 text-xl font-semibold text-white">{ACTIVE_USECASE}</h1>
                    <p className="mt-0.5 text-xs text-white/40">Showing events for this use case only</p>
                </div>

                {/* KPI Grid */}
                <motion.div
                    variants={STAGGER.container}
                    initial="initial"
                    animate="animate"
                    className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
                >
                    {kpis.map((kpi) => (
                        <motion.div key={kpi.label} variants={STAGGER.item}>
                            <Card className="flex flex-col gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg}`}>
                                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                                </div>
                                {statsLoading ? (
                                    <Skeleton className="h-7 w-16" />
                                ) : (
                                    <p className="text-2xl font-semibold tabular-nums text-white">{kpi.value}</p>
                                )}
                                <p className="text-xs text-white/40">{kpi.label}</p>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Recent Workflows */}
                <div className="mt-8">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-medium text-white/60">Recent Workflows</h2>
                        <Link href="/workflows" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                            View all →
                        </Link>
                    </div>

                    {wfLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full rounded-lg" />
                            ))}
                        </div>
                    ) : (
                        <motion.div
                            variants={STAGGER.container}
                            initial="initial"
                            animate="animate"
                            className="space-y-2"
                        >
                            {(workflowsPage?.data ?? []).map((wf) => (
                                <motion.div key={wf.workflowId} variants={STAGGER.item}>
                                    <Link
                                        href={`/workflows/${encodeURIComponent(wf.workflowId)}`}
                                        className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3 transition-all hover:border-brand-600/30 hover:bg-brand-600/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <StatusBadge status={wf.latestStatus as WorkflowEventStatus} />
                                            <span className="font-mono text-sm text-white/80">{wf.workflowId}</span>
                                            <span className="text-xs text-white/30">
                                                {wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-6 text-xs text-white/40">
                                            <span>{formatCost(wf.totalCost)}</span>
                                            <span>{formatTokens(wf.totalTokenUsage)} tokens</span>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                            {workflowsPage?.data.length === 0 && (
                                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] py-16 text-center">
                                    <GitBranch className="mb-3 h-8 w-8 text-white/20" />
                                    <p className="text-sm text-white/30">No workflows received yet</p>
                                    <p className="mt-1 text-xs text-white/20">Events will appear here as they arrive from Kafka</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
