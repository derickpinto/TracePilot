import { Module } from '@nestjs/common';
import { WorkflowGateway } from './workflow.gateway';
import { WorkflowStateModule } from '../workflow-state/workflow-state.module';

@Module({
    imports: [WorkflowStateModule],
    providers: [WorkflowGateway],
    exports: [WorkflowGateway],
})
export class WebSocketGatewayModule { }
