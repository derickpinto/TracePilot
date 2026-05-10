'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyGraph, SankeyNode as D3SankeyNode, SankeyLink as D3SankeyLink } from 'd3-sankey';
import { motion } from 'framer-motion';
import { WorkflowState, STATUS_COLORS } from '@ai-dashboard/shared';
import { buildSankeyData } from './sankey-transform';

interface SankeyChartProps {
    workflow: WorkflowState;
    width?: number;
    height?: number;
}

interface NodeData { id: string; name: string; status?: string; count: number }
interface LinkData { source: string; target: string; value: number; status?: string }

type SNode = D3SankeyNode<NodeData, LinkData>;
type SLink = D3SankeyLink<NodeData, LinkData>;

const MARGIN = { top: 20, right: 140, bottom: 20, left: 20 };

export function SankeyChart({ workflow, width = 800, height = 400 }: SankeyChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    const sankeyData = useMemo(() => buildSankeyData(workflow), [workflow]);

    useEffect(() => {
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        if (!sankeyData.nodes.length) return;

        const innerW = width - MARGIN.left - MARGIN.right;
        const innerH = height - MARGIN.top - MARGIN.bottom;

        const sankeyLayout = sankey<NodeData, LinkData>()
            .nodeId((d) => d.id)
            .nodeWidth(16)
            .nodePadding(14)
            .extent([[0, 0], [innerW, innerH]]);

        let graph: SankeyGraph<NodeData, LinkData>;
        try {
            graph = sankeyLayout({
                nodes: sankeyData.nodes.map((n) => ({ ...n })),
                links: sankeyData.links.map((l) => ({ ...l })),
            });
        } catch {
            return;
        }

        const g = svg
            .append('g')
            .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

        // Gradient defs for links
        const defs = svg.append('defs');

        // Links
        const linkGroup = g.append('g').attr('fill', 'none');

        graph.links.forEach((link: SLink, i) => {
            const sourceNode = link.source as SNode;
            const targetNode = link.target as SNode;
            const color = STATUS_COLORS[(link.status as keyof typeof STATUS_COLORS) ?? 'completed'] ?? '#6366f1';
            const gradId = `grad-${i}`;

            const grad = defs.append('linearGradient')
                .attr('id', gradId)
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', sourceNode.x1 ?? 0)
                .attr('x2', targetNode.x0 ?? 0);

            grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.6);
            grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.2);

            linkGroup.append('path')
                .attr('d', sankeyLinkHorizontal()(link) ?? '')
                .attr('stroke', `url(#${gradId})`)
                .attr('stroke-width', Math.max(1, link.width ?? 1))
                .attr('opacity', 0.8)
                .on('mouseover', function () { d3.select(this).attr('opacity', 1); })
                .on('mouseout', function () { d3.select(this).attr('opacity', 0.8); });
        });

        // Animated flow particles
        graph.links.forEach((link: SLink, i) => {
            const color = STATUS_COLORS[(link.status as keyof typeof STATUS_COLORS) ?? 'completed'] ?? '#6366f1';
            const path = linkGroup.append('path')
                .attr('d', sankeyLinkHorizontal()(link) ?? '')
                .attr('fill', 'none')
                .attr('stroke', color)
                .attr('stroke-width', 2)
                .attr('opacity', 0);

            const pathNode = path.node();
            if (!pathNode) return;
            const pathLength = pathNode.getTotalLength();

            linkGroup.append('circle')
                .attr('r', 3)
                .attr('fill', color)
                .attr('opacity', 0.9)
                .append('animateMotion')
                .attr('dur', `${1.5 + i * 0.3}s`)
                .attr('repeatCount', 'indefinite')
                .append('mpath')
                .attr('href', `#flow-path-${i}`);

            linkGroup.append('path')
                .attr('id', `flow-path-${i}`)
                .attr('d', sankeyLinkHorizontal()(link) ?? '')
                .attr('fill', 'none')
                .attr('stroke', 'none');
        });

        // Nodes
        const nodeGroup = g.append('g');

        graph.nodes.forEach((node: SNode) => {
            const color = STATUS_COLORS[(node.status as keyof typeof STATUS_COLORS) ?? 'completed'] ?? '#6366f1';
            const x0 = node.x0 ?? 0;
            const y0 = node.y0 ?? 0;
            const x1 = node.x1 ?? 0;
            const y1 = node.y1 ?? 0;

            nodeGroup.append('rect')
                .attr('x', x0)
                .attr('y', y0)
                .attr('width', x1 - x0)
                .attr('height', Math.max(4, y1 - y0))
                .attr('fill', color)
                .attr('opacity', 0.9)
                .attr('rx', 4);

            // Label
            const labelX = x1 + 8;
            const labelY = (y0 + y1) / 2;

            nodeGroup.append('text')
                .attr('x', labelX)
                .attr('y', labelY - 5)
                .attr('dy', '0.35em')
                .attr('fill', 'rgba(255,255,255,0.85)')
                .attr('font-size', '11px')
                .attr('font-family', 'Inter, system-ui, sans-serif')
                .attr('font-weight', '500')
                .text(node.name);

            nodeGroup.append('text')
                .attr('x', labelX)
                .attr('y', labelY + 10)
                .attr('dy', '0.35em')
                .attr('fill', 'rgba(255,255,255,0.35)')
                .attr('font-size', '10px')
                .attr('font-family', 'Inter, system-ui, sans-serif')
                .text(`${node.count} events`);
        });
    }, [sankeyData, width, height]);

    if (!sankeyData.nodes.length || !sankeyData.links.length) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-white/30">
                Not enough steps to render flow diagram
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="h-full w-full overflow-hidden"
        >
            <svg
                ref={svgRef}
                width={width}
                height={height}
                style={{ width: '100%', height: '100%' }}
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="xMidYMid meet"
            />
        </motion.div>
    );
}
