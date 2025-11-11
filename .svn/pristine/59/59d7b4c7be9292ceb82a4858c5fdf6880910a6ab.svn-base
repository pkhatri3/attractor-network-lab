

export function addRectangularGrid({
  graph,
  cx,
  cy,
  rows,
  cols,
  spacing,
  nodeSize,
  nextId,      // function that returns a new incremental id string, e.g. () => `n-${++nodeIdRef.current}`
}) {
  const ids = [];
  const positions = [];

  // Center the grid around (cx, cy)
  const totalW = (cols - 1) * spacing;
  const totalH = (rows - 1) * spacing;
  const x0 = cx - totalW / 2;
  const y0 = cy - totalH / 2;

  // Create nodes row-major
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = nextId();
      const x = x0 + c * spacing;
      const y = y0 + r * spacing;

      graph.addNode(id, {
        x,
        y,
        size: nodeSize,
        color: "#48dbfb",
        label: id,
      });

      ids.push(id);
      positions.push({ r, c, id });
    }
  }

  // Connect orthogonal neighbors only
  const indexAt = (r, c) => r * cols + c;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = indexAt(r, c);
      const id = ids[i];

      // Right neighbor
      if (c + 1 < cols) {
        const j = indexAt(r, c + 1);
        const idR = ids[j];
        if (!graph.hasEdge(id, idR)) graph.addEdge(id, idR, { color: "white" });
      }
      // Down neighbor
      if (r + 1 < rows) {
        const j = indexAt(r + 1, c);
        const idD = ids[j];
        if (!graph.hasEdge(id, idD)) graph.addEdge(id, idD, { color: "white" });
      }
    }
  }

  return {
    ids,
    center: { x: cx, y: cy },
    rows,
    cols,
    spacing,
  };
}
