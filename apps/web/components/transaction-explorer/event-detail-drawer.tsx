'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Cpu, DollarSign, GitBranch } from 'lucide-react';
import { TransactionDetail } from '@ai-dashboard/shared';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDuration, formatCost, formatTimestamp, formatTokens } from '@/lib/format';
import Link from 'next/link';

interface EventDetailDrawerProps {
    transaction: TransactionDetail;
    open: boolean;
    onClose: () => void;
}

export function EventDetailDrawer({ transaction, open, onClose }: EventDetailDrawerProps) {
    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    {/* Drawer */}
                    <motion.aside
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-white/[0.07] bg-[hsl(222,47%,6%)] shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="font-mono text-sm font-semibold text-white">{transaction.transactionId}</h2>
                                    <StatusBadge status={transaction.status} />
                                </div>
                                <p className="mt-0.5 text-xs text-white/40">
                                    Workflow: <span className="text-white/60">{transaction.workflowId}</span>
                                </p>
                            </div>
                            <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.05] hover:text-white">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-0 border-b border-white/[0.07]">
                            {[
                                { icon: Clock, label: 'Duration', value: formatDuration(transaction.totalDurationMs) },
                                { icon: Cpu, label: 'Tokens', value: formatTokens(transaction.totalTokenUsage) },
                                { icon: DollarSign, label: 'Cost', value: formatCost(transaction.totalCost) },
                            ].map((stat, i) => (
                                <div key={i} className={`flex flex-col gap-1 p-4 ${i < 2 ? 'border-r border-white/[0.07]' : ''}`}>
                                    <div className="flex items-center gap-1.5 text-xs text-white/40">
                                        <stat.icon className="h-3 w-3" />
                                        {stat.label}
                                    </div>
                                    <p className="font-mono text-sm font-semibold text-white">{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Event Timeline */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-white/40">
                                Event Timeline ({transaction.events.length} steps)
                            </h3>
                            <div className="relative">
                                <div className="absolute left-3 top-0 h-full w-px bg-white/[0.06]" />
                                <div className="space-y-4">
                                    {transaction.events.map((event, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: 12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="relative pl-8"
                                        >
                                            <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.1] bg-[hsl(222,40%,9%)]">
                                                <span className="text-[9px] text-white/40">{i + 1}</span>
                                            </div>
                                            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-sm font-medium text-white/80">{event.step}</span>
                                                    <StatusBadge status={event.status} showDot={false} />
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/40">
                                                    <span>{formatTimestamp(event.timestamp)}</span>
                                                    {event.durationMs != null && <span>{formatDuration(event.durationMs)}</span>}
                                                    {event.tokenUsage != null && event.tokenUsage > 0 && (
                                                        <span>{formatTokens(event.tokenUsage)} tok</span>
                                                    )}
                                                    {event.cost != null && event.cost > 0 && <span>{formatCost(event.cost)}</span>}
                                                </div>
                                                {event.metadata && Object.keys(event.metadata).length > 0 && (
                                                    <pre className="mt-2 max-h-24 overflow-auto rounded bg-black/30 p-2 font-mono text-[10px] text-white/50">
                                                        {JSON.stringify(event.metadata, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-white/[0.07] px-6 py-3">
                            <Link
                                href={`/transactions/${encodeURIComponent(transaction.transactionId)}`}
                                className="flex items-center gap-2 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                                onClick={onClose}
                            >
                                <GitBranch className="h-3 w-3" />
                                Full transaction replay view →
                            </Link>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
