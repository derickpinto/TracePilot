import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
    WorkflowEvent,
    WorkflowState,
    WorkflowStep,
    TransactionDetail,
    PaginatedResponse,
    WorkflowEventStatus,
} from '@ai-dashboard/shared';
import { AppConfig } from '../common/app-config';

interface StoredWorkflow {
    state: WorkflowState;
    expiresAt: number;
}

interface StoredTransaction {
    detail: TransactionDetail;
    expiresAt: number;
}

@Injectable()
export class WorkflowStateService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(WorkflowStateService.name);
    private readonly workflows = new Map<string, StoredWorkflow>();
    private readonly transactions = new Map<string, StoredTransaction>();
    private evictionTimer: NodeJS.Timeout | null = null;

    constructor(private readonly config: AppConfig) {
        super();
        this.setMaxListeners(50);
    }

    onModuleInit() {
        const intervalMs = Math.min(this.config.stateTtlMinutes * 60 * 1000, 5 * 60 * 1000);
        this.evictionTimer = setInterval(() => this.evictExpired(), intervalMs);
        this.logger.log(
            `State manager initialized | maxWorkflows=${this.config.stateMaxWorkflows} | ttl=${this.config.stateTtlMinutes}m`,
        );
    }

    onModuleDestroy() {
        if (this.evictionTimer) clearInterval(this.evictionTimer);
    }

    ingestEvent(event: WorkflowEvent): void {
        const ttlMs = this.config.stateTtlMinutes * 60 * 1000;
        const expiresAt = Date.now() + ttlMs;

        // --- Workflow state ---
        const existing = this.workflows.get(event.workflowId);
        const now = new Date().toISOString();

        const step: WorkflowStep = {
            step: event.step,
            status: event.status,
            timestamp: event.timestamp,
            durationMs: event.durationMs,
            tokenUsage: event.tokenUsage,
            cost: event.cost,
            metadata: event.metadata,
            transactionId: event.transactionId,
            usecase: event.usecase,
        };

        if (existing) {
            const s = existing.state;
            s.steps.push(step);
            s.latestStatus = event.status;
            s.totalDurationMs += event.durationMs ?? 0;
            s.totalTokenUsage += event.tokenUsage ?? 0;
            s.totalCost += event.cost ?? 0;
            s.updatedAt = now;
            if (!s.transactionIds.includes(event.transactionId)) {
                s.transactionIds.push(event.transactionId);
            }
            existing.expiresAt = expiresAt;
        } else {
            if (this.workflows.size >= this.config.stateMaxWorkflows) {
                this.evictOldest();
            }
            this.workflows.set(event.workflowId, {
                state: {
                    workflowId: event.workflowId,
                    usecase: event.usecase,
                    steps: [step],
                    latestStatus: event.status,
                    totalDurationMs: event.durationMs ?? 0,
                    totalTokenUsage: event.tokenUsage ?? 0,
                    totalCost: event.cost ?? 0,
                    startedAt: event.timestamp,
                    updatedAt: now,
                    transactionIds: [event.transactionId],
                },
                expiresAt,
            });
        }

        // --- Transaction state ---
        const txExisting = this.transactions.get(event.transactionId);
        if (txExisting) {
            const d = txExisting.detail;
            d.events.push(event);
            d.totalDurationMs += event.durationMs ?? 0;
            d.totalTokenUsage += event.tokenUsage ?? 0;
            d.totalCost += event.cost ?? 0;
            d.status = event.status;
            if (isTerminalStatus(event.status)) d.completedAt = event.timestamp;
            txExisting.expiresAt = expiresAt;
        } else {
            this.transactions.set(event.transactionId, {
                detail: {
                    transactionId: event.transactionId,
                    workflowId: event.workflowId,
                    usecase: event.usecase,
                    events: [event],
                    totalDurationMs: event.durationMs ?? 0,
                    totalTokenUsage: event.tokenUsage ?? 0,
                    totalCost: event.cost ?? 0,
                    status: event.status,
                    startedAt: event.timestamp,
                    completedAt: isTerminalStatus(event.status) ? event.timestamp : undefined,
                },
                expiresAt,
            });
        }

        this.emit('workflow.updated', this.workflows.get(event.workflowId)!.state);
        this.emit('transaction.updated', this.transactions.get(event.transactionId)!.detail);
        this.emit('stats.updated', this.getStats());
    }

    getWorkflow(workflowId: string): WorkflowState | null {
        return this.workflows.get(workflowId)?.state ?? null;
    }

    getWorkflows(
        page = 1,
        pageSize = 50,
        search?: string,
        usecase?: string,
    ): PaginatedResponse<WorkflowState> {
        let entries = Array.from(this.workflows.values()).map((e) => e.state);
        if (usecase) entries = entries.filter((s) => s.usecase === usecase);
        if (search) {
            const q = search.toLowerCase();
            entries = entries.filter((s) => s.workflowId.toLowerCase().includes(q));
        }
        entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        const total = entries.length;
        const start = (page - 1) * pageSize;
        const data = entries.slice(start, start + pageSize);
        return { data, total, page, pageSize, hasMore: start + pageSize < total };
    }

    getTransaction(transactionId: string): TransactionDetail | null {
        return this.transactions.get(transactionId)?.detail ?? null;
    }

    getTransactions(
        page = 1,
        pageSize = 50,
        workflowId?: string,
        search?: string,
        status?: WorkflowEventStatus,
        usecase?: string,
    ): PaginatedResponse<TransactionDetail> {
        let entries = Array.from(this.transactions.values()).map((e) => e.detail);
        if (usecase) entries = entries.filter((t) => t.usecase === usecase);
        if (workflowId) entries = entries.filter((t) => t.workflowId === workflowId);
        if (status) entries = entries.filter((t) => t.status === status);
        if (search) {
            const q = search.toLowerCase();
            entries = entries.filter(
                (t) => t.transactionId.toLowerCase().includes(q) || t.workflowId.toLowerCase().includes(q),
            );
        }
        entries.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
        const total = entries.length;
        const start = (page - 1) * pageSize;
        const data = entries.slice(start, start + pageSize);
        return { data, total, page, pageSize, hasMore: start + pageSize < total };
    }

    getStats(usecase?: string) {
        let workflows = Array.from(this.workflows.values()).map((e) => e.state);
        let transactions = Array.from(this.transactions.values()).map((e) => e.detail);
        if (usecase) {
            workflows = workflows.filter((w) => w.usecase === usecase);
            transactions = transactions.filter((t) => t.usecase === usecase);
        }
        const totalCost = workflows.reduce((s, w) => s + w.totalCost, 0);
        const totalTokens = workflows.reduce((s, w) => s + w.totalTokenUsage, 0);
        const byStatus = workflows.reduce(
            (acc, w) => {
                acc[w.latestStatus] = (acc[w.latestStatus] ?? 0) + 1;
                return acc;
            },
            {} as Record<string, number>,
        );
        return {
            totalWorkflows: workflows.length,
            totalTransactions: transactions.length,
            totalCost: Math.round(totalCost * 10000) / 10000,
            totalTokens,
            byStatus,
        };
    }

    private evictExpired(): void {
        const now = Date.now();
        let evictedW = 0;
        let evictedT = 0;
        for (const [id, entry] of this.workflows) {
            if (entry.expiresAt < now) {
                this.workflows.delete(id);
                evictedW++;
            }
        }
        for (const [id, entry] of this.transactions) {
            if (entry.expiresAt < now) {
                this.transactions.delete(id);
                evictedT++;
            }
        }
        if (evictedW > 0 || evictedT > 0) {
            this.logger.debug(`TTL eviction: ${evictedW} workflows, ${evictedT} transactions`);
        }
    }

    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        for (const [id, entry] of this.workflows) {
            if (entry.expiresAt < oldestTime) {
                oldestTime = entry.expiresAt;
                oldestKey = id;
            }
        }
        if (oldestKey) this.workflows.delete(oldestKey);
    }
}

function isTerminalStatus(status: WorkflowEventStatus): boolean {
    return ['completed', 'failed', 'approved', 'rejected'].includes(status);
}
