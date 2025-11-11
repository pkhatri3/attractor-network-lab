// src/utils/graphUtils.js

/**
 * Serialize a Graphology graph into a plain object
 * suitable for saving or transferring to the Learning phase.
 * 
 * @param {Graph} graph - Graphology instance
 * @returns {{ N: number, C: number[][], layout: {x:number, y:number}[] }}
 */
export function serializeGraph(graph) {
  if (!graph || typeof graph.nodes !== "function") {
    console.warn("serializeGraph: invalid graph object");
    return { N: 0, C: [], layout: [] };
  }

  const nodes = graph.nodes();
  const N = nodes.length;
  if (N === 0) return { N: 0, C: [], layout: [] };

  // --- Build index map ---
  const indexMap = {};
  nodes.forEach((id, idx) => {
    indexMap[id] = idx;
  });

  // --- Create empty adjacency matrix ---
  const C = Array.from({ length: N }, () => Array(N).fill(0));

  // --- Save layout positions ---
  const layout = nodes.map((id) => {
    const attrs = graph.getNodeAttributes(id) || {};
    return { x: attrs.x ?? 0, y: attrs.y ?? 0 };
  });

  // --- Fill connections ---
  graph.forEachEdge((edge, attrs, source, target) => {
    const i = indexMap[source];
    const j = indexMap[target];
    if (i != null && j != null) {
      C[i][j] = 1;
      C[j][i] = 1;
    }
  });

  return { N, C, layout };
}

/**
 * Utility to generate a new incremental node ID
 * (useful for custom layouts like grids or hopfield).
 */
export function makeIdGenerator(prefix = "n") {
  let count = 0;
  return () => `${prefix}-${++count}`;
}

/**
 * Quick utility for clearing a Graphology graph.
 * Keeps consistency between UI reset and graph state.
 */
export function clearGraph(graph) {
  if (graph && typeof graph.clear === "function") {
    graph.clear();
  }
}
