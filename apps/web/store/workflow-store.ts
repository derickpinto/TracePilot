'use client';

import { create } from 'zustand';
import { WorkflowState, TransactionDetail } from '@ai-dashboard/shared';

interface WorkflowStore {
    workflows: Map<string, WorkflowState>;
    transactions: Map<string, TransactionDetail>;
    stats: {
        totalWorkflows: number;
        totalTransactions: number;
        totalCost: number;
        totalTokens: number;
        byStatus: Record<string, number>;
    } | null;
    wsConnected: boolean;
    recentlyUpdated: Set<string>;

    setWorkflow: (state: WorkflowState) => void;
    setTransaction: (detail: TransactionDetail) => void;
    setStats: (stats: WorkflowStore['stats']) => void;
    setWsConnected: (connected: boolean) => void;
    markUpdated: (id: string) => void;
    clearUpdated: (id: string) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
    workflows: new Map(),
    transactions: new Map(),
    stats: null,
    wsConnected: false,
    recentlyUpdated: new Set(),

    setWorkflow: (state) =>
        set((prev) => {
            const next = new Map(prev.workflows);
            next.set(state.workflowId, state);
            return { workflows: next };
        }),

    setTransaction: (detail) =>
        set((prev) => {
            const next = new Map(prev.transactions);
            next.set(detail.transactionId, detail);
            return { transactions: next };
        }),

    setStats: (stats) => set({ stats }),

    setWsConnected: (wsConnected) => set({ wsConnected }),

    markUpdated: (id) =>
        set((prev) => {
            const next = new Set(prev.recentlyUpdated);
            next.add(id);
            return { recentlyUpdated: next };
        }),

    clearUpdated: (id) =>
        set((prev) => {
            const next = new Set(prev.recentlyUpdated);
            next.delete(id);
            return { recentlyUpdated: next };
        }),
}));
