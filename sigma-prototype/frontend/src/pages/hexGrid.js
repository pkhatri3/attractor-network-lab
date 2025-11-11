

export function addHexHoneycombGrid({
  graph,
  cx,
  cy,
  rows,
  cols,
  spacing,   
  nodeSize,
  nextId,
}) {
  const ids = [];

  const dx = spacing;                    
  const dy = spacing * Math.sqrt(3) / 2; 

  const totalW = (cols - 1) * dx + dx / 2;
  const totalH = (rows - 1) * dy;
  const x0 = cx - totalW / 2;
  const y0 = cy - totalH / 2;

  
  for (let r = 0; r < rows; r++) {
    const rowOffset = (r % 2 === 1) ? dx / 2 : 0;
    for (let c = 0; c < cols; c++) {
      const id = nextId();
      const x = x0 + rowOffset + c * dx;
      const y = y0 + r * dy;
      graph.addNode(id, { x, y, size: nodeSize, color: "#48dbfb", label: id });
      ids.push(id);
    }
  }

  const idx = (r, c) => r * cols + c;

  
  for (let r = 0; r < rows; r++) {
    const odd = (r % 2 === 1);
    for (let c = 0; c < cols; c++) {
      const cur = ids[idx(r, c)];

      
      if (c + 1 < cols) {
        const e = ids[idx(r, c + 1)];
        if (!graph.hasEdge(cur, e)) graph.addEdge(cur, e, { color: "white" });
      }

      if (r + 1 < rows) {
        if (odd) {
          
          const se = ids[idx(r + 1, c)];
          if (!graph.hasEdge(cur, se)) graph.addEdge(cur, se, { color: "white" });
          if (c + 1 < cols) {
            const sw = ids[idx(r + 1, c + 1)];
            if (!graph.hasEdge(cur, sw)) graph.addEdge(cur, sw, { color: "white" });
          }
        } else {
          
          if (c - 1 >= 0) {
            const se = ids[idx(r + 1, c - 1)];
            if (!graph.hasEdge(cur, se)) graph.addEdge(cur, se, { color: "white" });
          }
          const sw = ids[idx(r + 1, c)];
          if (!graph.hasEdge(cur, sw)) graph.addEdge(cur, sw, { color: "white" });
        }
      }
    }
  }

  return { ids, center: { x: cx, y: cy }, rows, cols, spacing: dx };
}


export const addHexLikeGrid = addHexHoneycombGrid;
