import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload, KafkaConfig, SASLOptions } from 'kafkajs';
import { WorkflowEventSchema } from '@ai-dashboard/shared';
import { WorkflowStateService } from '../workflow-state/workflow-state.service';
import { MongoService } from '../mongo/mongo.service';
import { AppConfig } from '../common/app-config';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(KafkaService.name);
    private kafka: Kafka;
    private consumer: Consumer;
    private isRunning = false;
    private reconnectTimer: NodeJS.Timeout | null = null;

    constructor(
        private readonly config: AppConfig,
        private readonly stateService: WorkflowStateService,
        private readonly mongoService: MongoService,
    ) {
        const kafkaConfig: KafkaConfig = {
            clientId: this.config.kafkaClientId,
            brokers: this.config.kafkaBrokers,
            retry: {
                // Disable KafkaJS internal retries — our scheduleReconnect handles reconnection
                retries: 0,
            },
            connectionTimeout: 10000,
            requestTimeout: 30000,
        };

        if (this.config.kafkaSaslMechanism && this.config.kafkaSaslUsername) {
            kafkaConfig.sasl = {
                mechanism: this.config.kafkaSaslMechanism as 'plain' | 'scram-sha-256' | 'scram-sha-512',
                username: this.config.kafkaSaslUsername,
                password: this.config.kafkaSaslPassword ?? '',
            } as SASLOptions;
        }

        if (this.config.kafkaSsl) {
            kafkaConfig.ssl = true;
        }

        this.kafka = new Kafka(kafkaConfig);
        this.consumer = this.kafka.consumer({
            groupId: this.config.kafkaGroupId,
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
            maxBytesPerPartition: 1024 * 1024,
        });
    }

    async onModuleInit() {
        // Non-blocking: Kafka unavailability must not crash the app
        this.connect().catch(() => void 0);
    }

    async onModuleDestroy() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        await this.disconnect();
    }

    private async connect() {
        try {
            await this.consumer.connect();
            this.logger.log(`Kafka consumer connected | group=${this.config.kafkaGroupId}`);

            for (const topic of this.config.kafkaTopics) {
                await this.consumer.subscribe({ topic, fromBeginning: false });
                this.logger.log(`Subscribed to topic: ${topic}`);
            }

            await this.consumer.run({
                eachMessage: async (payload: EachMessagePayload) => {
                    await this.processMessage(payload);
                },
            });

            this.isRunning = true;
        } catch (err) {
            this.logger.warn('Kafka unavailable — will retry in 30s');
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect(delayMs = 30_000) {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            try {
                await this.consumer.disconnect().catch(() => void 0);
            } catch { /* ignore */ }
            // Recreate consumer to reset internal state
            this.consumer = this.kafka.consumer({
                groupId: this.config.kafkaGroupId,
                sessionTimeout: 30000,
                heartbeatInterval: 3000,
                maxBytesPerPartition: 1024 * 1024,
            });
            this.connect().catch(() => void 0);
        }, delayMs);
    }

    private async processMessage({ topic, partition, message }: EachMessagePayload) {
        const raw = message.value?.toString();
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw);
            const result = WorkflowEventSchema.safeParse(parsed);

            if (!result.success) {
                this.logger.warn(
                    `Invalid event schema on topic=${topic} partition=${partition} offset=${message.offset}: ${JSON.stringify(result.error.issues)}`,
                );
                return;
            }

            this.stateService.ingestEvent(result.data);
            await this.mongoService.saveEvent(result.data);

            this.logger.debug(
                `Event ingested | workflowId=${result.data.workflowId} step=${result.data.step} status=${result.data.status}`,
            );
        } catch (err) {
            this.logger.error(
                `Failed to parse message from topic=${topic} offset=${message.offset}:`,
                err,
            );
        }
    }

    private async disconnect() {
        if (this.isRunning) {
            try {
                await this.consumer.disconnect();
                this.logger.log('Kafka consumer disconnected');
            } catch (err) {
                this.logger.error('Error disconnecting Kafka consumer:', err);
            }
        }
    }

    /**
     * Inject a synthetic event (used for testing / mock data injection)
     */
    async injectEvent(rawEvent: unknown): Promise<void> {
        const result = WorkflowEventSchema.safeParse(rawEvent);
        if (!result.success) {
            throw new Error(`Invalid event: ${JSON.stringify(result.error.issues)}`);
        }
        this.stateService.ingestEvent(result.data);
        await this.mongoService.saveEvent(result.data);
    }
}
