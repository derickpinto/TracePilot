import { Injectable, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class AppConfig {
    private readonly logger = new Logger(AppConfig.name);

    // Server
    readonly port: number = parseInt(process.env.PORT ?? '4000', 10);
    readonly nodeEnv: string = process.env.NODE_ENV ?? 'development';
    readonly corsOrigins: string[] = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',');

    // Kafka
    readonly kafkaBrokers: string[] = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
    readonly kafkaTopics: string[] = (process.env.KAFKA_TOPICS ?? 'ai-workflow-events').split(',');
    readonly kafkaGroupId: string = process.env.KAFKA_GROUP_ID ?? 'ai-dashboard-group';
    readonly kafkaClientId: string = process.env.KAFKA_CLIENT_ID ?? 'ai-dashboard';
    readonly kafkaSaslMechanism: string | undefined = process.env.KAFKA_SASL_MECHANISM;
    readonly kafkaSaslUsername: string | undefined = process.env.KAFKA_SASL_USERNAME;
    readonly kafkaSaslPassword: string | undefined = process.env.KAFKA_SASL_PASSWORD;
    readonly kafkaSsl: boolean = process.env.KAFKA_SSL === 'true';

    // MongoDB (optional)
    readonly mongoUri: string | undefined = process.env.MONGO_URI;
    readonly mongoDbName: string = process.env.MONGO_DB_NAME ?? 'ai_workflows';
    readonly mongoCollectionEvents: string =
        process.env.MONGO_COLLECTION_EVENTS ?? 'workflow_events';

    // In-memory state
    readonly stateMaxWorkflows: number = parseInt(process.env.STATE_MAX_WORKFLOWS ?? '10000', 10);
    readonly stateTtlMinutes: number = parseInt(process.env.STATE_TTL_MINUTES ?? '60', 10);

    // WebSocket
    readonly wsCorsOrigins: string[] = this.corsOrigins;

    get isMongoEnabled(): boolean {
        return !!this.mongoUri;
    }

    get isDevelopment(): boolean {
        return this.nodeEnv === 'development';
    }

    constructor() {
        this.logger.log(`Environment: ${this.nodeEnv}`);
        this.logger.log(`Kafka brokers: ${this.kafkaBrokers.join(', ')}`);
        this.logger.log(`Kafka topics: ${this.kafkaTopics.join(', ')}`);
        this.logger.log(`MongoDB: ${this.isMongoEnabled ? 'enabled' : 'disabled'}`);
    }
}
