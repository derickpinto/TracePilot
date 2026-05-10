import dagre from 'dagre';
import { WorkflowState, WorkflowStep } from '@ai-dashboard/shared';

export interface FlowNode {
    id: string;
    type: 'stepNode';
    position: { x: number; y: number };
    data: {
        step: string;
        status: WorkflowStep['status'];
        durationMs?: number;
        tokenUsage?: number;
        count: number;
    };
}

export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    type: 'smoothstep';
    animated: boolean;
    style: { stroke: string; strokeWidth: number; opacity: number };
    label?: string;
}

const STATUS_EDGE_COLORS: Record<string, string> = {
    completed: '#10b981',
    failed: '#ef4444',
    retry: '#f97316',
    running: '#3b82f6',
    pending: '#f59e0b',
    approved: '#8b5cf6',
    rejected: '#ec4899',
};

export function buildFlowGraph(workflow: WorkflowState): { nodes: FlowNode[]; edges: FlowEdge[] } {
    const steps = [...workflow.steps].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Aggregate steps by step name
    const stepMap = new Map<string, { status: WorkflowStep['status']; durationMs: number; tokenUsage: number; count: number }>();
    for (const s of steps) {
        const existing = stepMap.get(s.step);
        if (!existing) {
            stepMap.set(s.step, {
                status: s.status,
                durationMs: s.durationMs ?? 0,
                tokenUsage: s.tokenUsage ?? 0,
                count: 1,
            });
        } else {
            existing.count++;
            existing.durationMs += s.durationMs ?? 0;
            existing.tokenUsage += s.tokenUsage ?? 0;
            existing.status = s.status;
        }
    }

    // Build unique edges (step pairs)
    const edgeSet = new Set<string>();
    const edgeList: Array<{ source: string; target: string; status: string }> = [];
    for (let i = 0; i < steps.length - 1; i++) {
        const source = steps[i].step;
        const target = steps[i + 1].step;
        const key = `${source}→${target}`;
        if (!edgeSet.has(key) && source !== target) {
            edgeSet.add(key);
            edgeList.push({ source, target, status: steps[i + 1].status });
        }
    }

    // Dagre layout
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100, marginx: 20, marginy: 20 });

    for (const [id] of stepMap) {
        g.setNode(id, { width: 180, height: 70 });
    }
    for (const { source, target } of edgeList) {
        g.setEdge(source, target);
    }

    dagre.layout(g);

    const nodes: FlowNode[] = Array.from(stepMap.entries()).map(([id, data]) => {
        const node = g.node(id);
        return {
            id,
            type: 'stepNode',
            position: { x: node.x - 90, y: node.y - 35 },
            data: { step: id, ...data },
        };
    });

    const edges: FlowEdge[] = edgeList.map(({ source, target, status }, i) => ({
        id: `e-${i}-${source}-${target}`,
        source,
        target,
        type: 'smoothstep',
        animated: status === 'running',
        style: {
            stroke: STATUS_EDGE_COLORS[status] ?? '#6366f1',
            strokeWidth: 2,
            opacity: 0.7,
        },
    }));

    return { nodes, edges };
}
