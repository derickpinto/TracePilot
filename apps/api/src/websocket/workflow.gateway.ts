import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WorkflowStateService } from '../workflow-state/workflow-state.service';
import { AppConfig } from '../common/app-config';
import { WorkflowState, TransactionDetail, WsPayload } from '@ai-dashboard/shared';

@WebSocketGateway({
    cors: {
        origin: (origin: string, cb: (err: Error | null, allow?: boolean) => void) => {
            cb(null, true);
        },
        credentials: false,
    },
    transports: ['websocket', 'polling'],
})
export class WorkflowGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    @WebSocketServer() server!: Server;
    private readonly logger = new Logger(WorkflowGateway.name);

    constructor(
        private readonly stateService: WorkflowStateService,
        private readonly config: AppConfig,
    ) { }

    onModuleInit() {
        this.stateService.on('workflow.updated', (state: WorkflowState) => {
            const payload: WsPayload<WorkflowState> = {
                type: 'workflow.updated',
                data: state,
                timestamp: new Date().toISOString(),
            };
            this.server?.to(`workflow:${state.workflowId}`).emit('workflow.updated', payload);
            this.server?.to('global').emit('workflow.updated', payload);
        });

        this.stateService.on('transaction.updated', (detail: TransactionDetail) => {
            const payload: WsPayload<TransactionDetail> = {
                type: 'transaction.updated',
                data: detail,
                timestamp: new Date().toISOString(),
            };
            this.server?.to(`transaction:${detail.transactionId}`).emit('transaction.updated', payload);
            this.server?.to('global').emit('transaction.updated', payload);
        });
    }

    afterInit(server: Server) {
        this.logger.log('WebSocket gateway initialized');
    }

    handleConnection(client: Socket) {
        this.logger.debug(`Client connected: ${client.id}`);
        client.join('global');
        client.emit('ping', { timestamp: new Date().toISOString() });
    }

    handleDisconnect(client: Socket) {
        this.logger.debug(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('subscribe:workflow')
    handleSubscribeWorkflow(
        @MessageBody() data: { workflowId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const room = `workflow:${data.workflowId}`;
        client.join(room);
        const currentState = this.stateService.getWorkflow(data.workflowId);
        if (currentState) {
            const payload: WsPayload<WorkflowState> = {
                type: 'workflow.updated',
                data: currentState,
                timestamp: new Date().toISOString(),
            };
            client.emit('workflow.updated', payload);
        }
        return { event: 'subscribed', data: { room } };
    }

    @SubscribeMessage('unsubscribe:workflow')
    handleUnsubscribeWorkflow(
        @MessageBody() data: { workflowId: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.leave(`workflow:${data.workflowId}`);
        return { event: 'unsubscribed', data: { workflowId: data.workflowId } };
    }

    @SubscribeMessage('subscribe:transaction')
    handleSubscribeTransaction(
        @MessageBody() data: { transactionId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const room = `transaction:${data.transactionId}`;
        client.join(room);
        const currentState = this.stateService.getTransaction(data.transactionId);
        if (currentState) {
            const payload: WsPayload<TransactionDetail> = {
                type: 'transaction.updated',
                data: currentState,
                timestamp: new Date().toISOString(),
            };
            client.emit('transaction.updated', payload);
        }
        return { event: 'subscribed', data: { room } };
    }

    @SubscribeMessage('pong')
    handlePong(@ConnectedSocket() client: Socket) {
        return { event: 'ping', data: { timestamp: new Date().toISOString() } };
    }

    broadcastStats() {
        const stats = this.stateService.getStats();
        this.server?.to('global').emit('stats.updated', {
            type: 'stats.updated',
            data: stats,
            timestamp: new Date().toISOString(),
        });
    }
}
