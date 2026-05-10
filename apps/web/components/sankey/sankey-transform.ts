import { WorkflowState, SankeyData, SankeyNode, SankeyLink, WorkflowEventStatus } from '@ai-dashboard/shared';

export function buildSankeyData(workflow: WorkflowState): SankeyData {
    const steps = [...workflow.steps].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Collect unique nodes (step + status combos, but merge by step name for flow view)
    const nodeMap = new Map<string, SankeyNode>();
    const linkMap = new Map<string, SankeyLink & { value: number }>();

    // Create nodes per step name
    for (const step of steps) {
        if (!nodeMap.has(step.step)) {
            nodeMap.set(step.step, { id: step.step, name: step.step, count: 0, status: step.status });
        }
        const node = nodeMap.get(step.step)!;
        node.count++;
        // Status priority: failed > retry > rejected > running > pending > approved > completed
        node.status = highestPriorityStatus(node.status, step.status);
    }

    // Create links between consecutive steps
    for (let i = 0; i < steps.length - 1; i++) {
        const source = steps[i].step;
        const target = steps[i + 1].step;
        if (source === target) continue;
        const key = `${source}→${target}:${steps[i + 1].status}`;
        if (!linkMap.has(key)) {
            linkMap.set(key, { source, target, value: 0, status: steps[i + 1].status });
        }
        linkMap.get(key)!.value++;
    }

    // If only one step, still show it as a self node with trivial sankey
    const nodes = Array.from(nodeMap.values());
    const links = Array.from(linkMap.values());

    // Ensure each link source/target has a node
    const nodeIds = new Set(nodes.map((n) => n.id));
    const validLinks = links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target) && l.source !== l.target);

    return { nodes, links: validLinks };
}

const STATUS_PRIORITY: WorkflowEventStatus[] = [
    'failed',
    'retry',
    'rejected',
    'running',
    'pending',
    'approved',
    'completed',
];

function highestPriorityStatus(
    a: WorkflowEventStatus | undefined,
    b: WorkflowEventStatus,
): WorkflowEventStatus {
    if (!a) return b;
    const ai = STATUS_PRIORITY.indexOf(a);
    const bi = STATUS_PRIORITY.indexOf(b);
    return ai <= bi ? a : b;
}
