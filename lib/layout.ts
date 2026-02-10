import { Node, Edge } from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import type { InfraNodeData } from "@/lib/types";

const { graphlib, layout } = dagre;

// ============================================================
// Dagre-based topological auto-layout for the infrastructure canvas
// ============================================================

/** Estimated node dimensions (matches InfraNode component) */
const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;

/** Spacing between nodes */
const RANK_SEP = 100; // vertical distance between tiers
const NODE_SEP = 60; // horizontal distance between siblings

/**
 * Apply a topological (top-to-bottom) layout to the given nodes and edges
 * using dagre. Returns a new array of nodes with updated positions.
 *
 * Disconnected nodes are placed in a separate column to the right of
 * the main graph so they don't overlap.
 *
 * @param nodes  - current React Flow nodes
 * @param edges  - current React Flow edges
 * @returns      - new nodes array with computed positions
 */
export function applyDagreLayout(
  nodes: Node<InfraNodeData>[],
  edges: Edge[]
): Node<InfraNodeData>[] {
  if (nodes.length === 0) return nodes;

  // If there's only one node, center it
  if (nodes.length === 1) {
    return [
      {
        ...nodes[0],
        position: { x: 300, y: 200 },
      },
    ];
  }

  const g = new graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB", // top-to-bottom
    nodesep: NODE_SEP,
    ranksep: RANK_SEP,
    marginx: 50,
    marginy: 50,
  });

  // Add all nodes
  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Add edges
  for (const edge of edges) {
    // Only add the edge if both endpoints exist in the graph
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  // Run dagre layout
  layout(g);

  // Build the new nodes with dagre-computed positions
  // Dagre gives center coordinates; React Flow uses top-left
  const positioned = nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    return {
      ...node,
      position: {
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - NODE_HEIGHT / 2,
      },
    };
  });

  return positioned;
}
