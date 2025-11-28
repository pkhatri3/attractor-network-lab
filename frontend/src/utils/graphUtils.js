export function serializeGraph(graph) {
  if (!graph || typeof graph.nodes !== "function") {
    console.warn("serializeGraph: invalid graph object");
    return { N: 0, C: [], layout: [] };
  }

  const nodes = graph.nodes();
  const N = nodes.length;
  if (N === 0) return { N: 0, C: [], layout: [] };

  const indexMap = {};
  nodes.forEach((id, idx) => {
    indexMap[id] = idx;
  });

  const C = Array.from({ length: N }, () => Array(N).fill(0));

  const layout = nodes.map((id) => {
    const attrs = graph.getNodeAttributes(id) || {};
    return { x: attrs.x ?? 0, y: attrs.y ?? 0 };
  });

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

export function makeIdGenerator(prefix = "n") {
  let count = 0;
  return () => `${prefix}-${++count}`;
}

export function clearGraph(graph) {
  if (graph && typeof graph.clear === "function") {
    graph.clear();
  }
}
