import { Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { WorkflowStateModule } from '../workflow-state/workflow-state.module';
import { MongoModule } from '../mongo/mongo.module';

@Module({
    imports: [WorkflowStateModule, MongoModule],
    providers: [KafkaService],
    exports: [KafkaService],
})
export class KafkaModule { }
