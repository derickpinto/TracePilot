import {
    WorkflowState,
    TransactionDetail,
    PaginatedResponse,
    WorkflowEventStatus,
} from '@ai-dashboard/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${BASE}${path}`);
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined) url.searchParams.set(k, String(v));
        }
    }
    const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
    });
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`API ${path}: ${res.status} ${text}`);
    }
    return res.json() as Promise<T>;
}

export const api = {
    getWorkflows: (page = 1, pageSize = 50, search?: string, usecase?: string) =>
        get<PaginatedResponse<WorkflowState>>('/workflows', { page, pageSize, search, usecase }),

    getWorkflow: (id: string) =>
        get<WorkflowState>(`/workflows/${encodeURIComponent(id)}`),

    getTransactions: (params: {
        page?: number;
        pageSize?: number;
        workflowId?: string;
        search?: string;
        status?: WorkflowEventStatus;
        usecase?: string;
    }) => get<PaginatedResponse<TransactionDetail>>('/transactions', params as Record<string, string | number | undefined>),

    getTransaction: (id: string) =>
        get<TransactionDetail>(`/transactions/${encodeURIComponent(id)}`),

    getStats: (usecase?: string) =>
        get<{
            totalWorkflows: number;
            totalTransactions: number;
            totalCost: number;
            totalTokens: number;
            byStatus: Record<string, number>;
        }>('/stats', { usecase }),

    injectEvent: async (event: unknown): Promise<void> => {
        const res = await fetch(`${BASE}/events/inject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
        });
        if (!res.ok) throw new Error(`Inject failed: ${res.status}`);
    },
};
