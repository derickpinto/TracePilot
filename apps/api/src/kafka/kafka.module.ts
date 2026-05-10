import { Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { WorkflowStateModule } from '../workflow-state/workflow-state.module';

@Module({
    imports: [WorkflowStateModule],
    providers: [KafkaService],
    exports: [KafkaService],
})
export class KafkaModule { }
