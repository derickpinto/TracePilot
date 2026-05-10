import { Module } from '@nestjs/common';
import { ConfigModule } from './common/config.module';
import { KafkaModule } from './kafka/kafka.module';
import { WorkflowStateModule } from './workflow-state/workflow-state.module';
import { WebSocketGatewayModule } from './websocket/websocket.module';
import { MongoModule } from './mongo/mongo.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';

@Module({
    imports: [
        ConfigModule,
        HealthModule,
        WorkflowStateModule,
        WebSocketGatewayModule,
        MongoModule,
        EventsModule,
        KafkaModule,
    ],
})
export class AppModule { }
