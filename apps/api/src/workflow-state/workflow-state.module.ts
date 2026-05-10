import { Module } from '@nestjs/common';
import { WorkflowStateService } from './workflow-state.service';

@Module({
    providers: [WorkflowStateService],
    exports: [WorkflowStateService],
})
export class WorkflowStateModule { }
