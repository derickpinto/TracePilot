'use client';

import { useCallback, useMemo, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { WorkflowState } from '@ai-dashboard/shared';
import { buildFlowGraph } from './graph-layout';
import { StepNode } from './step-node';
import type { FlowNode, FlowEdge } from './graph-layout';

const NODE_TYPES = { stepNode: StepNode };

function FlowInner({ workflow }: { workflow: WorkflowState }) {
    const { fitView } = useReactFlow();
    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => buildFlowGraph(workflow),
        [workflow.workflowId],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as any);

    useEffect(() => {
        const { nodes: nextNodes, edges: nextEdges } = buildFlowGraph(workflow);
        setNodes(nextNodes as any);
        setEdges(nextEdges as any);
        setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
    }, [workflow]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={NODE_TYPES}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            className="react-flow-dark"
            proOptions={{ hideAttribution: true }}
        >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.05)" />
            <Controls showInteractive={false} />
            <MiniMap
                nodeColor={(node: any) => {
                    const status = node.data?.status;
                    const colors: Record<string, string> = {
                        completed: '#10b981',
                        failed: '#ef4444',
                        running: '#3b82f6',
                        pending: '#f59e0b',
                        retry: '#f97316',
                        approved: '#8b5cf6',
                        rejected: '#ec4899',
                    };
                    return colors[status] ?? '#6366f1';
                }}
                maskColor="rgba(0,0,0,0.6)"
            />
        </ReactFlow>
    );
}

interface WorkflowGraphProps {
    workflow: WorkflowState;
}

export function WorkflowGraph({ workflow }: WorkflowGraphProps) {
    if (!workflow.steps.length) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-white/30">
                No steps recorded yet
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="h-full w-full"
        >
            <ReactFlowProvider>
                <FlowInner workflow={workflow} />
            </ReactFlowProvider>
        </motion.div>
    );
}

// Lazy import to avoid SSR issues
import { ReactFlowProvider } from '@xyflow/react';
