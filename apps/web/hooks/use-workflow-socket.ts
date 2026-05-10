'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWorkflowStore } from '@/store/workflow-store';
import { WsPayload, WorkflowState, TransactionDetail } from '@ai-dashboard/shared';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

let globalSocket: Socket | null = null;
let refCount = 0;

function getSocket(): Socket {
    if (!globalSocket || !globalSocket.connected) {
        globalSocket = io(WS_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            reconnectionAttempts: Infinity,
        });
    }
    return globalSocket;
}

export function useWorkflowSocket() {
    const { setWorkflow, setTransaction, setStats, setWsConnected, markUpdated, clearUpdated } =
        useWorkflowStore();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const socket = getSocket();
        socketRef.current = socket;
        refCount++;

        const onConnect = () => {
            setWsConnected(true);
        };

        const onDisconnect = () => {
            setWsConnected(false);
        };

        const onWorkflowUpdated = (payload: WsPayload<WorkflowState>) => {
            setWorkflow(payload.data);
            markUpdated(payload.data.workflowId);
            setTimeout(() => clearUpdated(payload.data.workflowId), 2000);
        };

        const onTransactionUpdated = (payload: WsPayload<TransactionDetail>) => {
            setTransaction(payload.data);
            markUpdated(payload.data.transactionId);
            setTimeout(() => clearUpdated(payload.data.transactionId), 2000);
        };

        const onStatsUpdated = (payload: WsPayload<WorkflowStore['stats']>) => {
            setStats(payload.data);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('workflow.updated', onWorkflowUpdated);
        socket.on('transaction.updated', onTransactionUpdated);
        socket.on('stats.updated', onStatsUpdated);

        if (socket.connected) setWsConnected(true);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('workflow.updated', onWorkflowUpdated);
            socket.off('transaction.updated', onTransactionUpdated);
            socket.off('stats.updated', onStatsUpdated);
            refCount--;
        };
    }, []);

    const subscribeToWorkflow = (workflowId: string) => {
        socketRef.current?.emit('subscribe:workflow', { workflowId });
    };

    const subscribeToTransaction = (transactionId: string) => {
        socketRef.current?.emit('subscribe:transaction', { transactionId });
    };

    return { subscribeToWorkflow, subscribeToTransaction };
}

// Keep the store types accessible
type WorkflowStore = {
    stats: {
        totalWorkflows: number;
        totalTransactions: number;
        totalCost: number;
        totalTokens: number;
        byStatus: Record<string, number>;
    } | null;
};
