// Adds a hexagonal (honeycomb) lattice with optional "cap" half-columns
// so the outer diagonals reach the two corners.
export function addHexLikeGrid({
  graph,
  cx = 0,
  cy = 0,
  rows = 4,
  cols = 6,
  spacing = 50,
  nodeSize = 4,
  nextId,
  caps = false,
  connectionProb,
}) {
  const dx = spacing;                   // horizontal pitch between same-row neighbors
  const dy = (Math.sqrt(3) / 2) * dx;   // vertical pitch for hex packing

  // If caps are enabled, create an extra half-column at both ends
  // so diagonals can “reach” the outer corner nodes.
  const colsExt = caps ? cols + 1 : cols;

  const ids = [];
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (let r = 0; r < rows; r++) {
    ids[r] = [];
    const offsetX = (r % 2 === 0 ? 0 : dx / 2); // staggered rows

    for (let c = 0; c < colsExt; c++) {
      const x = cx + (c * dx) + offsetX - ((colsExt - 1) * dx) / 2;
      const y = cy + (r * dy) - ((rows - 1) * dy) / 2;

      const id = nextId();
      graph.addNode(id, {
        x,
        y,
        size: nodeSize,
        color: "#48dbfb",
        label: `Node ${id}`,
      });

      ids[r][c] = id;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // Connect neighbors: each node up to 6 edges (hex connectivity)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < colsExt; c++) {
      const id = ids[r][c];
      if (!id) continue;

      // Same-row neighbor (right)
      if (c + 1 < colsExt && Math.random() * 100 < connectionProb) graph.addEdge(id, ids[r][c + 1], { color: "rgba(255,255,255,0.08)" });

      // Upper diagonals (staggered)
      if (r > 0) {
        if (r % 2 === 0) {
          // even row connects up-left and up-right (c-1, c)
          if (c > 0 && Math.random() * 100 < connectionProb) graph.addEdge(id, ids[r - 1][c - 1], { color: "rgba(255,255,255,0.08)" });
          if (c < colsExt && Math.random() * 100 < connectionProb) graph.addEdge(id, ids[r - 1][c], { color: "rgba(255,255,255,0.08)" });
        } else {
          // odd row connects up-left and up-right (c, c+1)
          if (Math.random() * 100 < connectionProb) graph.addEdge(id, ids[r - 1][c], { color: "rgba(255,255,255,0.08)" });
          if (c + 1 < colsExt && Math.random() * 100 < connectionProb) graph.addEdge(id, ids[r - 1][c + 1], { color: "rgba(255,255,255,0.08)" });
        }
      }
    }
  }
}
