import { z } from 'zod';

export const WorkflowEventStatusSchema = z.enum([
    'pending',
    'running',
    'completed',
    'failed',
    'retry',
    'approved',
    'rejected',
]);

export const WorkflowEventSchema = z.object({
    workflowId: z.string().min(1),
    transactionId: z.string().min(1),
    usecase: z.string().min(1),
    step: z.string().min(1),
    status: WorkflowEventStatusSchema,
    timestamp: z.string().datetime(),
    durationMs: z.number().nonnegative().optional(),
    tokenUsage: z.number().nonnegative().optional(),
    cost: z.number().nonnegative().optional(),
    metadata: z.record(z.unknown()).optional().default({}),
});

export type WorkflowEventStatus = z.infer<typeof WorkflowEventStatusSchema>;
export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;

export const SankeyNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: WorkflowEventStatusSchema.optional(),
    count: z.number().default(0),
});

export const SankeyLinkSchema = z.object({
    source: z.string(),
    target: z.string(),
    value: z.number(),
    status: WorkflowEventStatusSchema.optional(),
});

export const SankeyDataSchema = z.object({
    nodes: z.array(SankeyNodeSchema),
    links: z.array(SankeyLinkSchema),
});

export type SankeyNode = z.infer<typeof SankeyNodeSchema>;
export type SankeyLink = z.infer<typeof SankeyLinkSchema>;
export type SankeyData = z.infer<typeof SankeyDataSchema>;

export interface WorkflowStep {
    step: string;
    status: WorkflowEventStatus;
    timestamp: string;
    durationMs?: number;
    tokenUsage?: number;
    cost?: number;
    metadata?: Record<string, unknown>;
    transactionId: string;
    usecase: string;
}

export interface WorkflowState {
    workflowId: string;
    usecase: string;
    steps: WorkflowStep[];
    latestStatus: WorkflowEventStatus;
    totalDurationMs: number;
    totalTokenUsage: number;
    totalCost: number;
    startedAt: string;
    updatedAt: string;
    transactionIds: string[];
}

export interface TransactionDetail {
    transactionId: string;
    workflowId: string;
    usecase: string;
    events: WorkflowEvent[];
    totalDurationMs: number;
    totalTokenUsage: number;
    totalCost: number;
    status: WorkflowEventStatus;
    startedAt: string;
    completedAt?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export type WsEventType = 'workflow.updated' | 'transaction.updated' | 'ping' | 'pong';

export interface WsPayload<T = unknown> {
    type: WsEventType;
    data: T;
    timestamp: string;
}

export const STATUS_COLORS: Record<WorkflowEventStatus, string> = {
    pending: '#f59e0b',
    running: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444',
    retry: '#f97316',
    approved: '#8b5cf6',
    rejected: '#ec4899',
};

export const STATUS_LABELS: Record<WorkflowEventStatus, string> = {
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    retry: 'Retry',
    approved: 'Approved',
    rejected: 'Rejected',
};
