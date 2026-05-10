import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Body,
    NotFoundException,
    ParseIntPipe,
    DefaultValuePipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { WorkflowStateService } from '../workflow-state/workflow-state.service';
import { KafkaService } from '../kafka/kafka.service';
import { WorkflowEventStatus } from '@ai-dashboard/shared';

@Controller()
export class EventsController {
    constructor(
        private readonly stateService: WorkflowStateService,
        private readonly kafkaService: KafkaService,
    ) { }

    @Get('workflows')
    listWorkflows(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
        @Query('search') search?: string,
        @Query('usecase') usecase?: string,
    ) {
        return this.stateService.getWorkflows(page, Math.min(pageSize, 200), search, usecase);
    }

    @Get('workflows/:id')
    getWorkflow(@Param('id') id: string) {
        const workflow = this.stateService.getWorkflow(id);
        if (!workflow) throw new NotFoundException(`Workflow '${id}' not found in memory`);
        return workflow;
    }

    @Get('transactions')
    listTransactions(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
        @Query('workflowId') workflowId?: string,
        @Query('search') search?: string,
        @Query('status') status?: WorkflowEventStatus,
        @Query('usecase') usecase?: string,
    ) {
        return this.stateService.getTransactions(
            page,
            Math.min(pageSize, 200),
            workflowId,
            search,
            status,
            usecase,
        );
    }

    @Get('transactions/:id')
    getTransaction(@Param('id') id: string) {
        const transaction = this.stateService.getTransaction(id);
        if (!transaction) throw new NotFoundException(`Transaction '${id}' not found in memory`);
        return transaction;
    }

    @Get('stats')
    getStats(@Query('usecase') usecase?: string) {
        return this.stateService.getStats(usecase);
    }

    /**
     * Development-only endpoint to inject synthetic events without Kafka.
     * Protected via NODE_ENV check — not exposed in production builds via env flag.
     */
    @Post('events/inject')
    @HttpCode(HttpStatus.ACCEPTED)
    async injectEvent(@Body() body: unknown) {
        await this.kafkaService.injectEvent(body);
        return { accepted: true, timestamp: new Date().toISOString() };
    }
}
