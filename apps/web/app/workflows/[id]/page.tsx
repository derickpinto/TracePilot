'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TopBar } from '@/components/layout/top-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { WorkflowEventStatus } from '@ai-dashboard/shared';
import { TransactionTable } from '@/components/transaction-explorer/transaction-table';

const WorkflowGraph = dynamic(
    () => import('@/components/workflow-graph/workflow-graph').then((m) => m.WorkflowGraph),
    { ssr: false },
);

const SankeyChart = dynamic(
    () => import('@/components/sankey/sankey-chart').then((m) => m.SankeyChart),
    { ssr: false },
);

type Tab = 'graph' | 'sankey' | 'transactions';

export default function WorkflowDetailPage() {
    const params = useParams();
    const id = decodeURIComponent(params.id as string);
    const [tab, setTab] = useState<Tab>('graph');

    const { data: workflow, isLoading } = useQuery({
        queryKey: ['workflow', id],
        queryFn: () => api.getWorkflow(id),
        refetchInterval: 3000,
    });

    const TABS: { id: Tab; label: string }[] = [
        { id: 'graph', label: 'Workflow Graph' },
        { id: 'sankey', label: 'Flow Diagram' },
        { id: 'transactions', label: 'Transactions' },
    ];

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <TopBar>
                <Link href="/workflows" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70">
                    <ArrowLeft className="h-3.5 w-3.5" /> Workflows
                </Link>
                {workflow && (
                    <>
                        <span className="font-mono text-sm text-white/80">{workflow.workflowId}</span>
                        <StatusBadge status={workflow.latestStatus as WorkflowEventStatus} />
                    </>
                )}
            </TopBar>

            {/* Tab bar */}
            <div className="flex border-b border-white/[0.06] px-6">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`mr-1 border-b-2 px-4 py-3 text-xs font-medium transition-colors ${tab === t.id
                                ? 'border-brand-500 text-brand-400'
                                : 'border-transparent text-white/40 hover:text-white/70'
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden p-6">
                {isLoading ? (
                    <Skeleton className="h-full w-full rounded-xl" />
                ) : !workflow ? (
                    <div className="flex h-full items-center justify-center text-white/30">
                        Workflow not found
                    </div>
                ) : (
                    <>
                        {tab === 'graph' && (
                            <div className="h-full rounded-xl border border-white/[0.06]">
                                <WorkflowGraph workflow={workflow} />
                            </div>
                        )}
                        {tab === 'sankey' && (
                            <div className="h-full rounded-xl border border-white/[0.06] bg-white/[0.01]">
                                <SankeyChart workflow={workflow} />
                            </div>
                        )}
                        {tab === 'transactions' && (
                            <TransactionTable workflowId={workflow.workflowId} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
