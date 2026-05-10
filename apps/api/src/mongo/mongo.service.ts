import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MongoClient, Db, ReadPreference } from 'mongodb';
import { WorkflowEvent, WorkflowEventSchema, TransactionDetail } from '@ai-dashboard/shared';
import { AppConfig } from '../common/app-config';

@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MongoService.name);
    private client: MongoClient | null = null;
    private db: Db | null = null;

    constructor(private readonly config: AppConfig) { }

    async onModuleInit() {
        if (!this.config.isMongoEnabled) {
            this.logger.log('MongoDB disabled (MONGO_URI not set)');
            return;
        }
        try {
            this.client = new MongoClient(this.config.mongoUri!, {
                readPreference: ReadPreference.SECONDARY_PREFERRED,
                // Read-only: no write concern needed
                maxPoolSize: 5,
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000,
            });
            await this.client.connect();
            this.db = this.client.db(this.config.mongoDbName);
            this.logger.log(`MongoDB connected | db=${this.config.mongoDbName}`);
        } catch (err) {
            this.logger.error('MongoDB connection failed (optional — continuing without it):', err);
            this.client = null;
            this.db = null;
        }
    }

    async onModuleDestroy() {
        if (this.client) {
            await this.client.close();
            this.logger.log('MongoDB disconnected');
        }
    }

    get isConnected(): boolean {
        return this.db !== null;
    }

    /**
     * Find historical events for a transaction from MongoDB.
     * STRICTLY read-only — only find operations used.
     */
    async findTransactionHistory(transactionId: string): Promise<TransactionDetail | null> {
        if (!this.db) return null;
        const collection = this.db.collection(this.config.mongoCollectionEvents);

        const docs = await collection
            .find({ transactionId }, { projection: { _id: 0 } })
            .sort({ timestamp: 1 })
            .limit(500)
            .toArray();

        if (!docs.length) return null;

        const events: WorkflowEvent[] = [];
        for (const doc of docs) {
            const result = WorkflowEventSchema.safeParse(doc);
            if (result.success) events.push(result.data);
        }

        if (!events.length) return null;

        const last = events[events.length - 1];
        return {
            transactionId,
            workflowId: events[0].workflowId,
            usecase: events[0].usecase,
            events,
            totalDurationMs: events.reduce((s, e) => s + (e.durationMs ?? 0), 0),
            totalTokenUsage: events.reduce((s, e) => s + (e.tokenUsage ?? 0), 0),
            totalCost: events.reduce((s, e) => s + (e.cost ?? 0), 0),
            status: last.status,
            startedAt: events[0].timestamp,
            completedAt: last.timestamp,
        };
    }

    /**
     * Find historical workflow events from MongoDB.
     */
    async findWorkflowHistory(
        workflowId: string,
        limit = 200,
    ): Promise<WorkflowEvent[]> {
        if (!this.db) return [];
        const collection = this.db.collection(this.config.mongoCollectionEvents);
        const docs = await collection
            .find({ workflowId }, { projection: { _id: 0 } })
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();
        const events: WorkflowEvent[] = [];
        for (const doc of docs) {
            const result = WorkflowEventSchema.safeParse(doc);
            if (result.success) events.push(result.data);
        }
        return events;
    }

    /**
     * Paginated search of historical transactions.
     */
    async searchTransactions(query: {
        search?: string;
        workflowId?: string;
        status?: string;
        page?: number;
        pageSize?: number;
    }) {
        if (!this.db) return { data: [], total: 0, page: 1, pageSize: 50, hasMore: false };
        const collection = this.db.collection(this.config.mongoCollectionEvents);
        const filter: Record<string, unknown> = {};
        if (query.workflowId) filter['workflowId'] = query.workflowId;
        if (query.status) filter['status'] = query.status;
        if (query.search) {
            filter['$or'] = [
                { transactionId: { $regex: query.search, $options: 'i' } },
                { workflowId: { $regex: query.search, $options: 'i' } },
            ];
        }
        const page = query.page ?? 1;
        const pageSize = Math.min(query.pageSize ?? 50, 200);
        const skip = (page - 1) * pageSize;
        const [docs, total] = await Promise.all([
            collection.find(filter, { projection: { _id: 0 } }).sort({ timestamp: -1 }).skip(skip).limit(pageSize).toArray(),
            collection.countDocuments(filter),
        ]);
        return { data: docs, total, page, pageSize, hasMore: skip + pageSize < total };
    }
}
