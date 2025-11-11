// src/utils/ioUtils.js

// ---- Serialize a Graphology graph to a network object ----
export function serializeGraph(graph) {
  const nodes = graph.nodes();
  const N = nodes.length;
  const indexMap = {};
  nodes.forEach((id, idx) => { indexMap[id] = idx; });

  const C = Array.from({ length: N }, () => Array(N).fill(0));
  const layout = Array.from({ length: N }, () => ({ x: 0, y: 0 }));

  nodes.forEach((id, i) => {
    const attrs = graph.getNodeAttributes(id) || {};
    layout[i] = { x: attrs.x ?? 0, y: attrs.y ?? 0 };
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

// ---- Download helper ----
export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- Export as CSV ----
export function toAdjacencyCSV(network, { includeLayout = false } = {}) {
  const { N, C, layout = [] } = network || {};
  if (!N || !Array.isArray(C)) return "0";

  const lines = [String(N)];
  for (let i = 0; i < N; i++) {
    const row = (C[i] || []).map(v => (v ? 1 : 0)).join(",");
    lines.push(row);
  }

  if (includeLayout) {
    lines.push("# layout");
    for (let i = 0; i < N; i++) {
      const p = layout[i] || { x: i * 60, y: 0 };
      lines.push(`${p.x},${p.y}`);
    }
  }
  return lines.join("\n");
}

// ---- Import CSV ----
export function parseAdjacencyCSV(text) {
  const rawLines = text.trim().split(/\r?\n/);
  const lines = rawLines.map(l => l.trim()).filter(Boolean);
  if (!lines.length) throw new Error("Empty CSV");

  const N = parseInt(lines[0], 10);
  if (!Number.isInteger(N) || N <= 0) throw new Error("Invalid N in CSV");
  if (lines.length - 1 < N) throw new Error("CSV missing matrix rows");

  const C = Array.from({ length: N }, () => Array(N).fill(0));
  let idx = 1;
  for (let i = 0; i < N; idx++, i++) {
    const row = (lines[idx] || "").split(",").map(s => s.trim());
    if (row.length < N) throw new Error(`Row ${i + 1} has fewer than N entries`);
    for (let j = 0; j < N; j++) {
      const v = parseInt(row[j], 10);
      C[i][j] = Number.isNaN(v) ? 0 : (v ? 1 : 0);
    }
  }

  let layout = [];
  if (lines[idx] && lines[idx].toLowerCase() === "# layout") {
    idx++;
    if (lines.length - idx < N) throw new Error("CSV missing layout rows");
    layout = Array.from({ length: N }, (_, i) => {
      const parts = (lines[idx + i] || "").split(",").map(s => s.trim());
      if (parts.length < 2) return { x: i * 60, y: 0 };
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      return {
        x: Number.isFinite(x) ? x : i * 60,
        y: Number.isFinite(y) ? y : 0,
      };
    });
  }

  return { N, C, layout };
}

// ---- Load a network object into a Graphology graph ----
export function loadNetworkIntoGraph(graph, network, nodeSize = 5) {
  const { N = 0, C = [], layout = [] } = network || {};
  graph.clear();

  for (let i = 0; i < N; i++) {
    const id = `n-${i + 1}`;
    const pos = layout[i] || { x: i * 60, y: 0 };
    graph.addNode(id, {
      x: pos.x,
      y: pos.y,
      size: nodeSize,
      color: "#48dbfb",
      label: `Node ${i + 1}`,
    });
  }

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (C[i] && C[i][j] === 1) {
        const a = `n-${i + 1}`;
        const b = `n-${j + 1}`;
        if (!graph.hasEdge(a, b)) graph.addEdge(a, b, { color: "white" });
      }
    }
  }
}
