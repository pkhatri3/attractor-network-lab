/**
 * Grid-friendly Hopfield network builder
 * Creates a fully-connected network arranged on a square grid
 * Uses polygons that become progressively more circular:
 * 4 nodes -> square, 5 -> pentagon, 6 -> hexagon, etc.
 */

export function addGridHopfield({ graph, cx, cy, count, spacing, nodeSize, nextId, connectionProb }) {
  const ids = [];
  
  // Generate positions based on polygon approximation
  const positions = generatePolygonGridPositions(count, spacing);
  
  // Add nodes at the calculated grid positions
  positions.forEach((pos, i) => {
    const id = nextId();
    graph.addNode(id, {
      x: cx + pos.x,
      y: cy + pos.y,
      size: nodeSize,
      color: "#48dbfb",
      label: `Node ${id.split("-")[1]}`,
    });
    ids.push(id);
  });

  // Fully connect all nodes (Hopfield property)
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (Math.random() * 100 < connectionProb) graph.addEdge(ids[i], ids[j], { color: "white" });
    }
  }

  return { ids };
}

/**
 * Generate grid positions for a polygon with 'count' vertices
 * Creates regular polygons (triangle, square, pentagon, hexagon, etc.)
 * that become progressively more circular as vertex count increases
 */
function generatePolygonGridPositions(count, spacing) {
  if (count <= 0) return [];
  
  // Special case: 1 node at center
  if (count === 1) {
    return [{ x: 0, y: 0 }];
  }
  
  // Special case: 2 nodes horizontal
  if (count === 2) {
    return [
      { x: -spacing * 2, y: 0 },
      { x: spacing * 2, y: 0 }
    ];
  }
  
  // Special case: 3 nodes triangle
  if (count === 3) {
    const height = spacing * 3;
    return [
      { x: 0, y: -height },
      { x: -height * 0.866, y: height / 2 },
      { x: height * 0.866, y: height / 2 }
    ].map(pos => ({
      x: Math.round(pos.x / spacing) * spacing,
      y: Math.round(pos.y / spacing) * spacing
    }));
  }
  
  // For 4+ nodes: create a regular polygon
  // Calculate radius to give nice spacing between vertices
  // For a regular n-gon, the side length s relates to radius r by: s = 2r * sin(π/n)
  // We want adjacent nodes to be about 3-4 grid spaces apart
  const desiredSideLength = spacing * 3.5;
  const radius = desiredSideLength / (2 * Math.sin(Math.PI / count));
  
  const positions = [];
  const seen = new Set();
  
  // Place vertices of regular polygon
  for (let i = 0; i < count; i++) {
    // Start from top (angle = -π/2) and go clockwise
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    
    // Calculate exact polygon vertex position
    const exactX = radius * Math.cos(angle);
    const exactY = radius * Math.sin(angle);
    
    // Snap to nearest grid intersection
    let gridX = Math.round(exactX / spacing) * spacing;
    let gridY = Math.round(exactY / spacing) * spacing;
    
    // Check for collisions
    let key = `${gridX},${gridY}`;
    if (seen.has(key)) {
      // Try the exact position without rounding (pick closest of the 4 surrounding grid points)
      const candidates = [
        { x: Math.floor(exactX / spacing) * spacing, y: Math.floor(exactY / spacing) * spacing },
        { x: Math.ceil(exactX / spacing) * spacing, y: Math.floor(exactY / spacing) * spacing },
        { x: Math.floor(exactX / spacing) * spacing, y: Math.ceil(exactY / spacing) * spacing },
        { x: Math.ceil(exactX / spacing) * spacing, y: Math.ceil(exactY / spacing) * spacing }
      ];
      
      // Find the closest unused grid point
      for (const candidate of candidates) {
        const cKey = `${candidate.x},${candidate.y}`;
        if (!seen.has(cKey)) {
          gridX = candidate.x;
          gridY = candidate.y;
          key = cKey;
          break;
        }
      }
    }
    
    seen.add(key);
    positions.push({ x: gridX, y: gridY });
  }
  
  return positions;
}
