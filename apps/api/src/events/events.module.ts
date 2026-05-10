import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { WorkflowStateModule } from '../workflow-state/workflow-state.module';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
    imports: [WorkflowStateModule, KafkaModule],
    controllers: [EventsController],
})
export class EventsModule { }
