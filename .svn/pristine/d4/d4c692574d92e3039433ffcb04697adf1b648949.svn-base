export function addRectangularGrid({ graph, cx, cy, rows, cols, spacing, nodeSize, nextId }) {
  const ids = [];
  const startX = cx - ((cols - 1) * spacing) / 2;
  const startY = cy - ((rows - 1) * spacing) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = nextId();
      const x = startX + c * spacing;
      const y = startY + r * spacing;
      graph.addNode(id, {
        x,
        y,
        size: nodeSize,
        color: "#48dbfb",
        label: `Node ${id.split("-")[1]}`,
      });
      ids.push(id);
    }
  }

  // connect adjacent nodes horizontally and vertically
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (c < cols - 1) graph.addEdge(ids[idx], ids[idx + 1], { color: "white" });
      if (r < rows - 1) graph.addEdge(ids[idx], ids[idx + cols], { color: "white" });
    }
  }

  return { ids };
}
