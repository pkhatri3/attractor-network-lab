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
  radius = 1,
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
        label: `Node ${id.split("-")[1]}`,
      });

      ids[r][c] = id;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // Build immediate neighbor map (radius 1 connections) and position map
  const neighbors = new Map();
  const nodePositions = new Map(); // Map from node ID to {r, c}
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < colsExt; c++) {
      const id = ids[r][c];
      if (!id) continue;
      
      nodePositions.set(id, { r, c });
      const neighborList = [];
      
      // Same-row neighbor (right)
      if (c + 1 < colsExt && ids[r][c + 1]) {
        neighborList.push({ r, c: c + 1 });
      }
      
      // Same-row neighbor (left)
      if (c > 0 && ids[r][c - 1]) {
        neighborList.push({ r, c: c - 1 });
      }
      
      // Upper diagonals (staggered)
      if (r > 0) {
        if (r % 2 === 0) {
          // even row connects up-left and up-right (c-1, c)
          if (c > 0 && ids[r - 1][c - 1]) {
            neighborList.push({ r: r - 1, c: c - 1 });
          }
          if (c < colsExt && ids[r - 1][c]) {
            neighborList.push({ r: r - 1, c });
          }
        } else {
          // odd row connects up-left and up-right (c, c+1)
          if (ids[r - 1][c]) {
            neighborList.push({ r: r - 1, c });
          }
          if (c + 1 < colsExt && ids[r - 1][c + 1]) {
            neighborList.push({ r: r - 1, c: c + 1 });
          }
        }
      }
      
      // Lower diagonals (staggered)
      if (r < rows - 1) {
        if (r % 2 === 0) {
          // even row connects down-left and down-right (c-1, c)
          if (c > 0 && ids[r + 1][c - 1]) {
            neighborList.push({ r: r + 1, c: c - 1 });
          }
          if (c < colsExt && ids[r + 1][c]) {
            neighborList.push({ r: r + 1, c });
          }
        } else {
          // odd row connects down-left and down-right (c, c+1)
          if (ids[r + 1][c]) {
            neighborList.push({ r: r + 1, c });
          }
          if (c + 1 < colsExt && ids[r + 1][c + 1]) {
            neighborList.push({ r: r + 1, c: c + 1 });
          }
        }
      }
      
      neighbors.set(id, neighborList);
    }
  }

  // BFS function to find all nodes within radius distance
  const findNodesWithinRadius = (startId, maxRadius) => {
    const visited = new Set();
    const result = new Set();
    const startPos = nodePositions.get(startId);
    if (!startPos) return result;
    
    const queue = [{ id: startId, r: startPos.r, c: startPos.c, dist: 0 }];
    visited.add(startId);
    
    while (queue.length > 0) {
      const { id, r, c, dist } = queue.shift();
      
      if (dist > 0 && dist <= maxRadius) {
        result.add(id);
      }
      
      if (dist < maxRadius) {
        const neighborList = neighbors.get(id) || [];
        for (const { r: nr, c: nc } of neighborList) {
          const neighborId = ids[nr]?.[nc];
          if (neighborId && !visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push({ id: neighborId, r: nr, c: nc, dist: dist + 1 });
          }
        }
      }
    }
    
    return result;
  };

  // Connect nodes based on radius
  const connectedPairs = new Set(); // Track connected pairs to avoid duplicates
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < colsExt; c++) {
      const id = ids[r][c];
      if (!id) continue;

      if (radius === 1) {
        // For radius 1, use the original immediate neighbor logic
        const neighborList = neighbors.get(id) || [];
        for (const { r: nr, c: nc } of neighborList) {
          const neighborId = ids[nr]?.[nc];
          if (neighborId) {
            // Create a unique key for the edge pair (order-independent)
            const edgeKey = id < neighborId ? `${id}-${neighborId}` : `${neighborId}-${id}`;
            if (!connectedPairs.has(edgeKey) && Math.random() * 100 < connectionProb) {
              graph.addEdge(id, neighborId, { color: "rgba(255,255,255,0.08)" });
              connectedPairs.add(edgeKey);
            }
          }
        }
      } else {
        // For radius > 1, find all nodes within radius and connect them
        const nodesInRadius = findNodesWithinRadius(id, radius);
        for (const neighborId of nodesInRadius) {
          // Create a unique key for the edge pair (order-independent)
          const edgeKey = id < neighborId ? `${id}-${neighborId}` : `${neighborId}-${id}`;
          if (!connectedPairs.has(edgeKey) && Math.random() * 100 < connectionProb) {
            graph.addEdge(id, neighborId, { color: "rgba(255,255,255,0.08)" });
            connectedPairs.add(edgeKey);
          }
        }
      }
    }
  }
}
