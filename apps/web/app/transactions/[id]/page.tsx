'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Cpu, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { TopBar } from '@/components/layout/top-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatDuration, formatCost, formatTimestamp, formatTokens } from '@/lib/format';
import { WorkflowEventStatus } from '@ai-dashboard/shared';

export default function TransactionDetailPage() {
    const params = useParams();
    const id = decodeURIComponent(params.id as string);

    const { data: tx, isLoading } = useQuery({
        queryKey: ['transaction', id],
        queryFn: () => api.getTransaction(id),
        refetchInterval: 3000,
    });

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <TopBar>
                <Link href="/transactions" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70">
                    <ArrowLeft className="h-3.5 w-3.5" /> Transactions
                </Link>
                {tx && <span className="font-mono text-sm text-white/80">{tx.transactionId}</span>}
            </TopBar>

            <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                    </div>
                ) : !tx ? (
                    <div className="flex h-full items-center justify-center text-white/30">
                        Transaction not found
                    </div>
                ) : (
                    <>
                        {/* Summary */}
                        <div className="mb-6 flex flex-wrap items-center gap-4">
                            <StatusBadge status={tx.status as WorkflowEventStatus} />
                            <div className="flex items-center gap-1.5 text-xs text-white/40">
                                <Clock className="h-3 w-3" /> {formatDuration(tx.totalDurationMs)}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-white/40">
                                <Cpu className="h-3 w-3" /> {formatTokens(tx.totalTokenUsage)} tokens
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-white/40">
                                <DollarSign className="h-3 w-3" /> {formatCost(tx.totalCost)}
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="relative max-w-2xl">
                            <div className="absolute left-5 top-0 h-full w-px bg-white/[0.06]" />
                            <div className="space-y-4">
                                {tx.events.map((event, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="relative pl-12"
                                    >
                                        <div className="absolute left-2.5 top-3 flex h-5 w-5 items-center justify-center rounded-full border border-white/[0.1] bg-[hsl(222,40%,9%)] text-[9px] text-white/40">
                                            {i + 1}
                                        </div>
                                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-semibold text-white">{event.step}</h3>
                                                    <StatusBadge status={event.status as WorkflowEventStatus} showDot />
                                                </div>
                                                <span className="text-xs text-white/30">{formatTimestamp(event.timestamp)}</span>
                                            </div>

                                            {/* Duration bar */}
                                            {event.durationMs != null && (
                                                <div className="mt-3">
                                                    <div className="mb-1 flex items-center justify-between text-[10px] text-white/40">
                                                        <span>Duration</span>
                                                        <span>{formatDuration(event.durationMs)}</span>
                                                    </div>
                                                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(100, (event.durationMs / Math.max(tx.totalDurationMs, 1)) * 100)}%` }}
                                                            transition={{ delay: i * 0.05 + 0.2, duration: 0.4 }}
                                                            className="h-full rounded-full bg-brand-500"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Token + cost chips */}
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {event.tokenUsage != null && event.tokenUsage > 0 && (
                                                    <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                                                        {formatTokens(event.tokenUsage)} tokens
                                                    </span>
                                                )}
                                                {event.cost != null && event.cost > 0 && (
                                                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                                                        {formatCost(event.cost)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Metadata */}
                                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                                                <details className="mt-3">
                                                    <summary className="cursor-pointer text-[10px] text-white/30 hover:text-white/50">
                                                        Metadata
                                                    </summary>
                                                    <pre className="mt-2 overflow-auto rounded bg-black/30 p-2 font-mono text-[10px] text-white/50">
                                                        {JSON.stringify(event.metadata, null, 2)}
                                                    </pre>
                                                </details>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
