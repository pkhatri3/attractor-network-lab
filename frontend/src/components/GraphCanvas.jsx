import React, { useEffect, useRef, useContext } from "react";
import Sigma from "sigma";
import Graph from "graphology";
import { GraphContext } from "../GraphContext";
import { addRectangularGrid } from "../pages/rectGrid";
import { addHexLikeGrid } from "../pages/hexGrid";
import { addHopfieldCluster } from "../pages/hopfield";
import { addGridHopfield } from "../pages/gridHopfield";

// Grid & spacing (GU = graph units)
const GRID_STEP_GU = 25;
const GRID_MIN_GU = -5000;
const GRID_MAX_GU = 5000;

// template spacing means some number of grid cells
const TEMPLATE_CELLS = 2;
const TEMPLATE_SPACING_GU = GRID_STEP_GU * TEMPLATE_CELLS;

// Ensures a network is connected
function ensureNetworkConnected(graph, nodeIds) {
  if (!graph || !nodeIds || nodeIds.length < 2) return;

  const inSet = new Set(nodeIds);
  const visited = new Set();
  const pos = {};
  nodeIds.forEach((id) => {
    const a = graph.getNodeAttributes(id);
    pos[id] = { x: a.x, y: a.y };
  });

  // build components
  const components = [];
  const dfs = (start) => {
    const stack = [start];
    const comp = [];
    visited.add(start);
    while (stack.length) {
      const u = stack.pop();
      comp.push(u);
      graph.forEachNeighbor(u, (v) => {
        if (inSet.has(v) && !visited.has(v)) {
          visited.add(v);
          stack.push(v);
        }
      });
    }
    return comp;
  };
  nodeIds.forEach((id) => {
    if (!visited.has(id) && inSet.has(id)) components.push(dfs(id));
  });
  if (components.length <= 1) return;

  // compute centroids
  const centroids = components.map((comp) => {
    let sx = 0, sy = 0;
    comp.forEach((id) => {
      sx += pos[id].x;
      sy += pos[id].y;
    });
    const n = comp.length || 1;
    return { x: sx / n, y: sy / n };
  });

  // connect closest centroids
  const connected = [0]; // indices of components connected so far
  const remaining = new Set(components.map((_, i) => i).slice(1));

  while (remaining.size > 0) {
    let best = { dist: Infinity, i: null, j: null, u: null, v: null };

    for (const i of connected) {
      for (const j of remaining) {
        const dx = centroids[i].x - centroids[j].x;
        const dy = centroids[i].y - centroids[j].y;
        const d = dx * dx + dy * dy;
        if (d < best.dist) {
          // find the true nearest pair
          let minPair = { dist: Infinity, u: null, v: null };
          for (const u of components[i]) {
            for (const v of components[j]) {
              const dx2 = pos[u].x - pos[v].x;
              const dy2 = pos[u].y - pos[v].y;
              const d2 = dx2 * dx2 + dy2 * dy2;
              if (d2 < minPair.dist) minPair = { dist: d2, u, v };
            }
          }
          best = { dist: d, i, j, ...minPair };
        }
      }
    }

    if (best.u && best.v) {
      try {
        graph.addEdge(best.u, best.v, { color: "rgba(255,255,255,0.08)" });
      } catch {}
      connected.push(best.j);
      remaining.delete(best.j);
    } else break;
  }

  // refresh for serialization
  sigma.refresh();
  graph.refreshIndex?.();
}

// Keep any x/y inside our world bounds 
function clampGU({ x, y }) {
  return {
    x: Math.max(GRID_MIN_GU, Math.min(GRID_MAX_GU, x)),
    y: Math.max(GRID_MIN_GU, Math.min(GRID_MAX_GU, y)),
  };
}
// Look through labels like "Node 12" to figure out the biggest number used so far 
function getMaxNodeIndex(graph) {
  let maxK = 0;
  graph.forEachNode((id, attrs) => {
    if (attrs?.isAnchor || attrs?.hidden) return;
    const m = (attrs?.label || "").match(/\b(\d+)\b/);
    if (!m) return;
    const k = parseInt(m[1], 10);
    if (k > maxK) maxK = k;
  });
  return maxK;
}

// If ids look like "n-2", keep that suffix in sync too
function getMaxIdSuffix(graph) {
  let maxS = 0;
  for (const id of graph.nodes()) {
    const m = String(id).match(/^n-(\d+)$/);
    if (m) {
      const k = parseInt(m[1], 10);
      if (k > maxS) maxS = k;
    }
  }
  return maxS;
}

// A small factory that gives you unique ids like n-3, n-4,n-5,etc.
function uniqueNextIdFactory(graph, nodeIdRef) {
  const maxLabel = getMaxNodeIndex(graph);
  const maxIdSuf = getMaxIdSuffix(graph);
  nodeIdRef.current = Math.max(maxLabel, maxIdSuf);

  return function nextId() {
    let id;
    do {
      id = `n-${++nodeIdRef.current}`;
    } while (graph.hasNode(id));
    return id;
  };
}
// Snap an arbitrary graph position to the nearest grid dot (in graph units)
function snapGraphGU(x, y) {
  const step = GRID_STEP_GU;
  const sx = Math.round(x / step) * step;
  const sy = Math.round(y / step) * step;
  return clampGU({ x: sx, y: sy });
}
// Convert viewport (pixels) to graph, then snap to grid so it's consistent across zoom levels 
function snapViewportToGraph(vx, vy, sigma) {
  const g = sigma.viewportToGraph({ x: vx, y: vy });
  return snapGraphGU(g.x, g.y);
}
// Graph coords
function toGridIJ({ x, y }) {
  const step = GRID_STEP_GU;
  return { i: Math.round(x / step), j: Math.round(y / step) };
}
function fromGridIJ({ i, j }) {
  const step = GRID_STEP_GU;
  return clampGU({ x: i * step, y: j * step });
}

// Apply snapped x/y and remember what cell the node lives on
function setSnappedNode(graph, id, pos) {
  const snapped = snapGraphGU(pos.x, pos.y);
  const { i, j } = toGridIJ(snapped);
  const p = fromGridIJ({ i, j });
  graph.setNodeAttribute(id, "x", p.x);
  graph.setNodeAttribute(id, "y", p.y);
  graph.setNodeAttribute(id, "gridI", i);
  graph.setNodeAttribute(id, "gridJ", j);
}

// Snap only nodes that just got added after a batch operation
function snapNewNodesIfGrid({ graph, sigma, beforeSet, gridMode }) {
  if (!gridMode) return;
  for (const id of graph.nodes()) {
    if (beforeSet.has(id)) continue;
    const a = graph.getNodeAttributes(id);
    setSnappedNode(graph, id, { x: a.x, y: a.y });
  }
}

// Nudge a freshly added group a few pixels so its edges land exactly on grid lines
function shiftGroupOntoGrid({ graph, ids }) {
  if (!ids || !ids.length) return;
  const step = GRID_STEP_GU;

  // extremes to lock a consistent corner
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  ids.forEach((id) => {
    const a = graph.getNodeAttributes(id);
    if (a.x < minX) minX = a.x;
    if (a.x > maxX) maxX = a.x;
    if (a.y < minY) minY = a.y;
    if (a.y > maxY) maxY = a.y;
  });

  // how far we are from the nearest grid line 
  const corr = (v) => {
    const r = ((v % step) + step) % step;
    return r <= step / 2 ? -r : step - r;
  };

  const dx = corr(maxX);
  const dy = corr(minY);
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return;

  ids.forEach((id) => {
    const a = graph.getNodeAttributes(id);
    graph.setNodeAttribute(id, "x", a.x + dx);
    graph.setNodeAttribute(id, "y", a.y + dy);
  });
}
// Edge normalization so we accept a variety of edge field names
function normalizeEdgeEndpoints(edge) {
  const s =
    edge.source ?? edge.from ?? edge.src ?? edge.u ?? edge.sourceId ?? edge.s;
  const t =
    edge.target ?? edge.to ?? edge.dst ?? edge.v ?? edge.targetId ?? edge.t;
  return [s, t];
}
// Quick symmetry check for a 0/1 adjacency matrix
function isSymmetric01(m) {
  if (!Array.isArray(m) || m.length === 0) return false;
  const n = m.length;
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(m[i]) || m[i].length !== n) return false;
    for (let j = i + 1; j < n; j++) {
      if ((m[i][j] ? 1 : 0) !== (m[j][i] ? 1 : 0)) return false;
    }
  }
  return true;
}
// If the custom template has some coordinates, use their centroid as the "cursor anchor"
function computeLayoutAnchor(nodesArray) {
  const pts = nodesArray
    .map((n) => ({ x: n?.x ?? null, y: n?.y ?? null }))
    .filter((p) => p.x !== null && p.y !== null);

  if (pts.length === 0) return { x: 0, y: 0 };
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { x: cx, y: cy };
}

// When a custom node doesn't have a position, just spread them around a small circle
function fallbackCirclePos(idx, count, radius = 120) {
  const t = (2 * Math.PI * idx) / Math.max(1, count);
  return { x: radius * Math.cos(t), y: radius * Math.sin(t) };
}
// main component
export default function GraphCanvas({ 
  mode,
  gridMode,
  nodeSizePreset,
  connectionProb,
  ensureConnected,
  hopfieldCount,
  rectRows,
  rectCols,
  hexRows,
  hexCols,
  hexRadius,
  onClearGraph,
  onGraphRefs,
  objectType,
  selectedTemplate,
  customTemplates = [],
}) {
  const { network } = useContext(GraphContext);
  const C = network?.C;
  const N = C ? C.length : 0;

  const containerRef = useRef(null);
  const gridCanvasRef = useRef(null);
  const graphRef = useRef(new Graph({ type: "undirected" }));
  const sigmaRef = useRef(null);
  const nodeIdRef = useRef(N);
  const selectedNodeRef = useRef(null);

  // store latest props in refs so event handlers see current values
  const modeRef = useRef(mode);
  const gridRef = useRef(gridMode);
  const nodeSizeRef = useRef(5);

  const connectionProbRef = useRef(connectionProb);
  const ensureConnectedRef = useRef(false);
  const hopfieldCountRef = useRef(hopfieldCount);
  const rectRowsRef = useRef(rectRows);
  const rectColsRef = useRef(rectCols);
  const hexRowsRef = useRef(hexRows);
  const hexColsRef = useRef(hexCols);
  const hexRadiusRef = useRef(hexRadius);

  const objectTypeRef = useRef(objectType);
  const selectedTemplateRef = useRef(selectedTemplate);
  const customTemplatesRef = useRef(customTemplates);

  // keep those refs in sync with prop changes
  useEffect(() => void (modeRef.current = mode), [mode]);
  useEffect(() => void (gridRef.current = gridMode), [gridMode]);
  useEffect(() => {
    nodeSizeRef.current =
      nodeSizePreset === "small" ? 4 : nodeSizePreset === "large" ? 8 : 5;
  }, [nodeSizePreset]);
  useEffect(() => void (connectionProbRef.current = connectionProb), [connectionProb]);
  useEffect(() => {
    ensureConnectedRef.current = ensureConnected;
  }, [ensureConnected]);
  useEffect(() => void (hopfieldCountRef.current = hopfieldCount), [hopfieldCount]);
  useEffect(() => void (rectRowsRef.current = rectRows), [rectRows]);
  useEffect(() => void (rectColsRef.current = rectCols), [rectCols]);
  useEffect(() => void (hexRowsRef.current = hexRows), [hexRows]);
  useEffect(() => void (hexColsRef.current = hexCols), [hexCols]);
  useEffect(() => void (hexRadiusRef.current = hexRadius), [hexRadius]);
  useEffect(() => void (objectTypeRef.current = objectType), [objectType]);
  useEffect(() => void (selectedTemplateRef.current = selectedTemplate), [selectedTemplate]);
  useEffect(() => void (customTemplatesRef.current = customTemplates), [customTemplates]);

  // small guard to temporarily allow x/y writes during controlled updates.
  const allowPosWritesRef = useRef(false);
  function withPositionWrites(fn) {
    allowPosWritesRef.current = true;
    try {
      fn();
    } finally {
      allowPosWritesRef.current = false;
    }
  }

  // Draw or clear the grid overlay 
  const drawGrid = () => {
    const sigma = sigmaRef.current;
    const canvas = gridCanvasRef.current;
    if (!sigma || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!gridRef.current) return;

    // figure out what slice of the graph is visible
    const stepGU = GRID_STEP_GU;
    const topLeftG = sigma.viewportToGraph({ x: 0, y: 0 });
    const botRightG = sigma.viewportToGraph({ x: width, y: height });
    const minX = Math.min(topLeftG.x, botRightG.x);
    const maxX = Math.max(topLeftG.x, botRightG.x);
    const minY = Math.min(topLeftG.y, botRightG.y);
    const maxY = Math.max(topLeftG.y, botRightG.y);

    const startX = Math.floor(minX / stepGU) * stepGU;
    const startY = Math.floor(minY / stepGU) * stepGU;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";

    // vertical lines
    for (let gx = startX; gx <= maxX; gx += stepGU) {
      const v0 = sigma.graphToViewport({ x: gx, y: minY });
      const v1 = sigma.graphToViewport({ x: gx, y: maxY });
      ctx.beginPath();
      ctx.moveTo(v0.x, v0.y);
      ctx.lineTo(v1.x, v1.y);
      ctx.stroke();
    }
    // horizontal lines
    for (let gy = startY; gy <= maxY; gy += stepGU) {
      const h0 = sigma.graphToViewport({ x: minX, y: gy });
      const h1 = sigma.graphToViewport({ x: maxX, y: gy });
      ctx.beginPath();
      ctx.moveTo(h0.x, h0.y);
      ctx.lineTo(h1.x, h1.y);
      ctx.stroke();
    }
  };

  useEffect(() => {
    drawGrid();
  }, [gridMode]);

  useEffect(() => {
    if (typeof onGraphRefs === "function") onGraphRefs({ graphRef, sigmaRef });
  }, [onGraphRefs]);

  // Drop a user-provided network (nodes/edges or adjacency matrix) at point p
  function placeCustomNetworkAt(
    graph,
    p,
    name,
    network,
    nextId,
    shouldSnap = false,
    connectionProb = 100
  ) {
    const nodesArray = network.layout || network.nodes || [];
    const rawEdges = network.edges || network.links || network.arcs || [];
    const matrix = network.C;

    // if the nodes don't have ids, make something consistent
    nodesArray.forEach((node, idx) => {
      if (!node.id && !node.key && !node.name && !node.label) node.id = idx;
    });

    // keep the template centered under the cursor
    const anchor = computeLayoutAnchor(nodesArray);
    const dx = p.x - anchor.x;
    const dy = p.y - anchor.y;

    const idxToNew = [];
    const keyToNew = {};

    // add nodes
    nodesArray.forEach((node, idx) => {
      const id = nextId();
      idxToNew[idx] = id;
      const key = node.id ?? node.key ?? node.name ?? node.label ?? idx;
      keyToNew[String(key)] = id;

      const hasPos = node?.x !== undefined && node?.y !== undefined;
      const local = hasPos ? { x: node.x, y: node.y } : fallbackCirclePos(idx, nodesArray.length);

      graph.addNode(id, {
        x: local.x + dx,
        y: local.y + dy,
        size: nodeSizeRef.current,
        color: "#48dbfb",
        label: `Node ${nodeIdRef.current}`,
        templateName: name,
      });

      // if grid is on, land them exactly on the dots
      if (shouldSnap) setSnappedNode(graph, id, { x: local.x + dx, y: local.y + dy });
    });

    // or maybe edges from explicit list
    let anyEdge = false;
    rawEdges.forEach((e) => {
      const [sRaw, tRaw] = normalizeEdgeEndpoints(e);
      const src =
        typeof sRaw === "number"
          ? idxToNew[sRaw]
          : keyToNew[String(sRaw)] ?? idxToNew[parseInt(sRaw)];
      const dst =
        typeof tRaw === "number"
          ? idxToNew[tRaw]
          : keyToNew[String(tRaw)] ?? idxToNew[parseInt(tRaw)];

      if (src && dst && src !== dst && Math.random() * 100 < connectionProb) {
        try {
          graph.addEdge(src, dst, { color: "rgba(255,255,255,0.08)", templateName: name });
          anyEdge = true;
        } catch {}
      }
    });

    // or edges from adjacency matrix if no explicit list
    if (!anyEdge && Array.isArray(matrix) && matrix.length) {
      const n = matrix.length;
      const symmetric = isSymmetric01(matrix);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (!matrix[i][j]) continue;
          if (symmetric && j <= i) continue; // avoid duplicates for undirected
          const src = idxToNew[i], dst = idxToNew[j];
          if (src && dst && src !== dst && Math.random() * 100 < connectionProb) {
            try {
              graph.addEdge(src, dst, { color: "rgba(255,255,255,0.08)", templateName: name });
            } catch {}
          }
        }
      }
    }

    if (ensureConnectedRef?.current) {
      try {
        const newIds = Object.values(idxToNew); // all newly added nodes
        ensureNetworkConnected(graph, newIds);
        sigma.refresh();
      } catch (err) {
        console.warn("Import force connectivity failed:", err);
      }
    }
  }

  // mount sigma once, wire handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const graph = graphRef.current;
    const sigma = new Sigma(graph, container, {
      renderLabels: false,
      allowInvalidContainer: true,
      settings: { mouseEnabled: true, enableCamera: true },
    });
    sigmaRef.current = sigma;

    // prevent accidental node moves except within controlled sections
    const guardHandler = ({ key, name, previous }) => {
      if ((name === "x" || name === "y") && !allowPosWritesRef.current) {
        graph.setNodeAttribute(key, name, previous);
      }
    };
    graph.on("nodeAttributesUpdated", guardHandler);

    // don't auto-rescale. We manage the user manages camera.
    sigma.setSetting("autoRescale", false);
    sigma.setSetting("autoRescaleOnNewNodes", false);
    sigma.setSetting("autoRescaleOnNewEdges", false);
    sigma.setSetting("autoRescaleOnResize", false);

    // invisible anchors to keep the camera bounds sane
    if (!graph.hasNode("__anchor1")) {
      graph.addNode("__anchor1", { x: -5000, y: -5000, hidden: true, isAnchor: true });
      graph.addNode("__anchor2", { x: 5000, y: 5000, hidden: true, isAnchor: true });
    }

    // center the camera
    const cam = sigma.getCamera();
    requestAnimationFrame(() => {
      const center = sigma.viewportToGraph({
        x: container.clientWidth / 2,
        y: container.clientHeight / 2,
      });
      cam.setState({ x: center.x, y: center.y, ratio: 1, angle: 0 });
    });

    // dragging state
    let draggedNode = null;
    let draggedGroup = [];
    let dragOffsets = {};     
    let startCursorIJ = null; 
    let nodeStartPos = {};    
    const mc = sigma.getMouseCaptor();

    // mouseup / drag end handler
    const endDrag = () => {
      if (!draggedNode) return;

      withPositionWrites(() => {
        if (gridRef.current) {
          // when grid is on, make sure final positions are snapped (for non-template multi-selects)
          draggedGroup.forEach((id) => {
            const a = graph.getNodeAttributes(id);
            setSnappedNode(graph, id, { x: a.x, y: a.y });
          });
        }
      });

      // set colors back
      draggedGroup.forEach((id) => graph.setNodeAttribute(id, "color", "#48dbfb"));
      draggedNode = null;
      draggedGroup = [];
      dragOffsets = {};
      cam.enable();
      sigma.refresh();
    };
    // mousedown on node handler
    const onDownNode = ({ node, event }) => {
      const mode = modeRef.current;
      // drag mode
      if (mode === "drag") {
        draggedNode = node;
        cam.disable();

        // If objectType is "template", we drag the connected component as a chunk. Otherwise just the single node.
        if (objectTypeRef.current === "template") {
          const visited = new Set();
          const queue = [node];
          while (queue.length) {
            const n = queue.pop();
            if (visited.has(n)) continue;
            visited.add(n);
            graph.forEachNeighbor(n, (nbr) => {
              if (!visited.has(nbr)) queue.push(nbr);
            });
          }
          draggedGroup = Array.from(visited);
        } else {
          draggedGroup = [node];
        }

        draggedGroup.forEach((id) => graph.setNodeAttribute(id, "color", "#38a8c2ff"));

        const startPos = sigma.viewportToGraph({ x: event.x, y: event.y });
        dragOffsets = {};
        draggedGroup.forEach((id) => {
          const attrs = graph.getNodeAttributes(id);
          dragOffsets[id] = { dx: attrs.x - startPos.x, dy: attrs.y - startPos.y };
        });

        nodeStartPos = {};
        draggedGroup.forEach((id) => {
          const a = graph.getNodeAttributes(id);
          nodeStartPos[id] = { x: a.x, y: a.y };
        });

        if (gridRef.current) {
          const p0 = sigma.viewportToGraph({ x: event.x, y: event.y });
          const snapped0 = snapGraphGU(p0.x, p0.y);
          startCursorIJ = toGridIJ(snapped0);
        }

        return;
      }
      // delete mode
      if (mode === "delete") {
        // Delete one node or TEMPLATE.
        const deleteComponent = objectTypeRef.current === "template" || !!event.shiftKey;
        const dropSet = new Set();

        if (deleteComponent) {
          const visited = new Set();
          const queue = [node];
          while (queue.length) {
            const n = queue.pop();
            if (visited.has(n)) continue;
            visited.add(n);
            graph.forEachNeighbor(n, (nbr) => {
              if (!visited.has(nbr)) queue.push(nbr); // traverse entire component, nbr means neighbors
            });
          }
          visited.forEach((n) => dropSet.add(n));
        } else {
          dropSet.add(node);
        }
        // perform deletion
        withPositionWrites(() => {
          dropSet.forEach((n) => {
            if (graph.hasNode(n)) graph.dropNode(n);
          });
        });

        // Re-label remaining visible nodes in order: Node 1, Node 2, etc..
        const ids = graph.nodes().filter((id) => {
          const a = graph.getNodeAttributes(id);
          return !a?.isAnchor && !a?.hidden;
        });

        ids.sort((a, b) => {
          const la = parseInt((graph.getNodeAttribute(a, "label") || "").match(/\d+/)?.[0] || "0", 10);
          const lb = parseInt((graph.getNodeAttribute(b, "label") || "").match(/\d+/)?.[0] || "0", 10);
          return la - lb;
        });

        ids.forEach((id, i) => {
          const k = i + 1;
          graph.setNodeAttribute(id, "label", `Node ${k}`);
          graph.setNodeAttribute(id, "index", k);
        });

        nodeIdRef.current = ids.length; // keep counter consistent with what's on screen
        selectedNodeRef.current = null;
        sigma.refresh();
        return;
      }
      // select-to-connect mode, edges toggling
      if (mode === "idle") {
        // simple select-to-connect behavior
        const selected = selectedNodeRef.current;

        if (!selected) {
          selectedNodeRef.current = node;
          graph.setNodeAttribute(node, "color", "#ffa502");
          sigma.refresh();
          return;
        }

        if (selected === node) {
          graph.setNodeAttribute(node, "color", "#48dbfb");
          selectedNodeRef.current = null;
          sigma.refresh();
          return;
        }
        // toggle edge between selected and this one 
        const hasEdge = graph.hasEdge(selected, node);
        if (hasEdge) graph.dropEdge(selected, node);
        else graph.addEdge(selected, node, { color: "rgba(255,255,255,0.08)" });
        // reset colors
        graph.setNodeAttribute(selected, "color", "#48dbfb");
        graph.setNodeAttribute(node, "color", "#48dbfb");
        selectedNodeRef.current = null;
        sigma.refresh();
      }
    };
    // mousemove handler for dragging.
    const onMouseMove = (e) => {
      if (!draggedNode || modeRef.current !== "drag") return;

      if (gridRef.current && startCursorIJ) {
        // grid-based drag: move the whole selection by full cells
        const p = sigma.viewportToGraph({ x: e.x, y: e.y });
        const snapped = snapGraphGU(p.x, p.y);
        const curIJ = toGridIJ(snapped);
        const di = curIJ.i - startCursorIJ.i;
        const dj = curIJ.j - startCursorIJ.j;

        const step = GRID_STEP_GU;
        const dX = di * step;
        const dY = dj * step;

        withPositionWrites(() => {
          draggedGroup.forEach((id) => {
            const p0 = nodeStartPos[id];
            graph.setNodeAttribute(id, "x", p0.x + dX);
            graph.setNodeAttribute(id, "y", p0.y + dY);
          });
        });
      } else {
        // free drag mode
        const pos = sigma.viewportToGraph({ x: e.x, y: e.y });
        withPositionWrites(() => {
          draggedGroup.forEach((id) => {
            const offset = dragOffsets[id];
            graph.setNodeAttribute(id, "x", pos.x + offset.dx);
            graph.setNodeAttribute(id, "y", pos.y + offset.dy);
          });
        });
      }

      sigma.refresh();
    };

    const onClickStage = ({ event }) => {
      if (modeRef.current !== "add") return;

      const p = gridRef.current
        ? snapViewportToGraph(event.x, event.y, sigma)
        : sigma.viewportToGraph({ x: event.x, y: event.y });

      const nextId = uniqueNextIdFactory(graph, nodeIdRef);

      if (objectTypeRef.current === "node") {
        // add a single node where you clicked
        const id = nextId();
        const label = `Node ${nodeIdRef.current}`;
        withPositionWrites(() => {
          graph.addNode(id, {
            x: p.x,
            y: p.y,
            size: nodeSizeRef.current,
            color: "#48dbfb",
            label,
          });
          if (gridRef.current) setSnappedNode(graph, id, p);
        });
        sigma.refresh();
        return;
      }

      if (objectTypeRef.current === "template") {
        // pick which template to use and add it
        const name = selectedTemplateRef.current || "Hopfield Connectivity";
        if (name.includes("Hopfield")) {
          const before = new Set(graph.nodes());

          if (gridRef.current) {
            withPositionWrites(() => {
              addGridHopfield({
                graph,
                cx: p.x,
                cy: p.y,
                count: parseInt(hopfieldCountRef.current, 10) || 12,
                spacing: GRID_STEP_GU,
                nodeSize: nodeSizeRef.current,
                nextId,
                connectionProb: parseFloat(connectionProbRef.current) || 100,
              });
              snapNewNodesIfGrid({ graph, sigma, beforeSet: before, gridMode: gridRef.current });

              // collect new node IDs
              const newIds = [];
              graph.forEachNode((id) => {
                if (!before.has(id) && !graph.getNodeAttribute(id, "isAnchor")) newIds.push(id);
              });

              // nudge onto grid
              shiftGroupOntoGrid({ graph, ids: newIds });

              // ensure connectivity only after nodes exist
              if (ensureConnectedRef.current) ensureNetworkConnected(graph, newIds);
            });
          } else {
            withPositionWrites(() => {
              addHopfieldCluster({
                graph,
                cx: p.x,
                cy: p.y,
                count: parseInt(hopfieldCountRef.current, 10) || 12,
                radius: 120,
                nodeSize: nodeSizeRef.current,
                nextId,
                connectionProb: parseFloat(connectionProbRef.current) || 100,
              });

              // collect new node IDs
              const newIds = [];
              graph.forEachNode((id) => {
                if (!before.has(id) && !graph.getNodeAttribute(id, "isAnchor")) newIds.push(id);
              });

              // ensure connectivity after all nodes are added
              if (ensureConnectedRef.current) ensureNetworkConnected(graph, newIds);
            });
          }
        } else if (name.includes("Rectangular")) {
          const rows = Math.max(1, parseInt(rectRowsRef.current || "3", 10));
          const cols = Math.max(1, parseInt(rectColsRef.current || "4", 10));
          const before = new Set(graph.nodes());
          withPositionWrites(() => {
            addRectangularGrid({
              graph,
              cx: p.x,
              cy: p.y,
              rows,
              cols,
              spacing: TEMPLATE_SPACING_GU,
              nodeSize: nodeSizeRef.current,
              nextId,
              connectionProb: parseFloat(connectionProbRef.current) || 100,
            });
            snapNewNodesIfGrid({ graph, sigma, beforeSet: before, gridMode: gridRef.current });
            const newIds = [];
            graph.forEachNode((id) => {
              if (!before.has(id) && !graph.getNodeAttribute(id, "isAnchor")) newIds.push(id);
            });
            shiftGroupOntoGrid({ graph, ids: newIds });

            if (ensureConnectedRef.current) ensureNetworkConnected(graph, newIds);
          });
        } else if (name.includes("Triangular")) {
          const rows = Math.max(1, parseInt(hexRowsRef.current || "4", 10));
          const cols = Math.max(1, parseInt(hexColsRef.current || "6", 10));
          const radius = Math.max(1, parseInt(hexRadiusRef.current || "1", 10));
          const before = new Set(graph.nodes());
          withPositionWrites(() => { 
            addHexLikeGrid({
              graph,
              cx: p.x,
              cy: p.y,
              rows,
              cols,
              spacing: TEMPLATE_SPACING_GU,
              nodeSize: nodeSizeRef.current,
              nextId,
              connectionProb: parseFloat(connectionProbRef.current) || 100,
              caps: false,
              radius,
            }); 
            // snap any new nodes to grid if needed
            snapNewNodesIfGrid({ graph, sigma, beforeSet: before, gridMode: gridRef.current });
            const newIds = [];
            graph.forEachNode((id) => {
              if (!before.has(id) && !graph.getNodeAttribute(id, "isAnchor")) newIds.push(id);
            });
            // snap any new nodes to grid if needed
            shiftGroupOntoGrid({ graph, ids: newIds });

            if (ensureConnectedRef.current) ensureNetworkConnected(graph, newIds);
          });
        } else {
          
          const custom = customTemplatesRef.current.find((t) => t.name === name && t.data);
          if (custom) {
            withPositionWrites(() => {
              placeCustomNetworkAt(
                graph,
                p,
                name,
                custom.data,
                nextId,
                gridRef.current,
                parseFloat(connectionProbRef.current) || 100
              );

              if (ensureConnectedRef.current) ensureNetworkConnected(graph, newIds);
            });
          }
        }

        // After adding a bunch of nodes, make sure each visible node has a clean, incremental label
        let maxNum = nodeIdRef.current;
        graph.forEachNode((id, attrs) => {
          if (attrs.isAnchor || attrs.hidden) return;
         if (!attrs.label || /(^|\s)n-\d+/.test(attrs.label)) {
              maxNum++;
              graph.setNodeAttribute(id, "label", `Node ${maxNum}`);
            }

        });
        nodeIdRef.current = maxNum;

        sigma.refresh();
      }
    };
    // wire up events, they stay for the lifetime of this sigma instance
    sigma.on("downNode", onDownNode);
    sigma.on("upNode", endDrag);
    sigma.on("clickStage", onClickStage);
    mc.on("mousemove", onMouseMove);
    mc.on("mouseup", endDrag);
    mc.on("leave", endDrag);
    // redraw grid on camera changes or resize
    const onCamUpdated = () => drawGrid();
    const onResize = () => drawGrid();
    cam.on("updated", onCamUpdated);
    window.addEventListener("resize", onResize);
    drawGrid();
    
    return () => {
      cam.off("updated", onCamUpdated);
      window.removeEventListener("resize", onResize);
      sigma.off("downNode", onDownNode);
      sigma.off("upNode", endDrag);
      sigma.off("clickStage", onClickStage);
      mc.off("mousemove", onMouseMove);
      mc.off("mouseup", endDrag);
      mc.off("leave", endDrag);
      graph.off("nodeAttributesUpdated", guardHandler);
      sigma.kill();
    };
  }, []);

  // Load a saved network once. If you already drew stuff, we leave them untouched.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    if (!network || !Array.isArray(network.C) || !Array.isArray(network.layout)) return;

    const visibleNodes = graph.nodes().filter((id) => !graph.getNodeAttribute(id, "hidden"));
    if (visibleNodes.length > 0) return;

    if (!graph.hasNode("__anchor1")) { // ensure anchors exist
      graph.addNode("__anchor1", { x: -5000, y: -5000, hidden: true }); 
      graph.addNode("__anchor2", { x: 5000, y: 5000, hidden: true });
    }

    const NN = network.C.length;
    const idxToId = [];
    
    for (let i = 0; i < NN; i++) {
      const pos = network.layout[i] || { x: 0, y: 0 };
      const id = `n${i}`;
      idxToId[i] = id;

      graph.addNode(id, {
        x: pos.x,
        y: pos.y,
        size: nodeSizeRef.current,
        color: "#48dbfb",
        label: `Node ${i + 1}`,
      });
    }
    // keep the nodeIdRef counter in sync
    const matrix = network.C;
    for (let i = 0; i < NN; i++) {
      for (let j = i + 1; j < NN; j++) {
        if (!matrix[i][j]) continue;
        const src = idxToId[i];
        const dst = idxToId[j];
        if (!src || !dst || src === dst) continue;
        try {
          graph.addEdge(src, dst, { color: "rgba(255,255,255,0.08)" });
        } catch {}
      }
    }

    sigmaRef.current?.refresh();
  }, [network]);

  // clears graph
  onClearGraph(() => {
    const graph = graphRef.current;
    if (!graph) return;

    // preserve anchors
    const anchors = [];
    graph.forEachNode((id) => {
      if (graph.getNodeAttribute(id, "isAnchor")) {
        anchors.push({ id, attrs: graph.getNodeAttributes(id) });
      }
    });

    // wipe the graph all at once
    graph.clear();

    // add anchors back
    anchors.forEach(({ id, attrs }) => graph.addNode(id, attrs));

    nodeIdRef.current = 0;
    sigmaRef.current?.refresh();
  });

  return (
    <>
      <div    
        ref={containerRef}
        className="sandbox-container"
        onDragOver={(e) => {
          // allow dragging in a named template from outside
          if (e.dataTransfer.types.includes("application/x-template-name")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
        // handle dropping a template onto the sandbox
        onDrop={(e) => {
          const nameLocal = e.dataTransfer.getData("application/x-template-name");
          if (!nameLocal) return;
          e.preventDefault();
          const sigma = sigmaRef.current;
          if (!sigma) return;
          // drop point in graph coords
          const p = gridRef.current
            ? snapViewportToGraph(e.clientX, e.clientY, sigma)
            : sigma.viewportToGraph({ x: e.clientX, y: e.clientY });

          const graph = graphRef.current;
          const before = new Set(graph.nodes());
          const nextId = uniqueNextIdFactory(graph, nodeIdRef);
          // add the dropped template at point p
          withPositionWrites(() => {
            if (nameLocal.includes("Hopfield")) {
              if (gridRef.current) {
                addGridHopfield({
                  graph,
                  cx: p.x,
                  cy: p.y,
                  count: parseInt(hopfieldCountRef.current, 10) || 12,
                  spacing: GRID_STEP_GU,
                  nodeSize: nodeSizeRef.current,
                  nextId,
                });
              } else { 
                addHopfieldCluster({
                  graph,
                  cx: p.x,
                  cy: p.y,
                  count: parseInt(hopfieldCountRef.current, 10) || 12,
                  radius: 120,
                  nodeSize: nodeSizeRef.current,
                  nextId,
                });
              }
            } else if (nameLocal.includes("Rectangular")) {
              const rows = Math.max(1, parseInt(rectRowsRef.current || "3", 10));
              const cols = Math.max(1, parseInt(rectColsRef.current || "4", 10));
              addRectangularGrid({
                graph,
                cx: p.x,
                cy: p.y,
                rows,
                cols,
                spacing: TEMPLATE_SPACING_GU,
                nodeSize: nodeSizeRef.current,
                nextId,
              });
            } else if (nameLocal.includes("Triangular")) {
              const rows = Math.max(1, parseInt(hexRowsRef.current || "4", 10));
              const cols = Math.max(1, parseInt(hexColsRef.current || "6", 10));
              const radius = Math.max(1, parseInt(hexRadiusRef.current || "1", 10));
              addHexLikeGrid({
                graph,
                cx: p.x,
                cy: p.y,
                rows,
                cols,
                spacing: TEMPLATE_SPACING_GU,
                nodeSize: nodeSizeRef.current,
                nextId,
                connectionProb: parseFloat(connectionProbRef.current) || 100,
                caps: false,
                radius,
              });
            } else {
              
              const custom = customTemplatesRef.current.find((t) => t.name === nameLocal && t.data);
              if (custom) {
                placeCustomNetworkAt(
                  graph,
                  p,
                  nameLocal,
                  custom.data,
                  nextId,
                  gridRef.current,
                  parseFloat(connectionProbRef.current) || 100
                );
              }
            }

            // snap only the freshly-added nodes and nudge the group if grid is on
            snapNewNodesIfGrid({ graph, sigma, beforeSet: before, gridMode: gridRef.current });

            if (gridRef.current) {
              const newIds = [];
              graph.forEachNode((id) => {
                if (!before.has(id) && !graph.getNodeAttribute(id, "isAnchor")) newIds.push(id);
              });
              shiftGroupOntoGrid({ graph, ids: newIds });
            }
          });

          sigma.refresh();
        }}
      />
      {/* Grid overlay (only visible when grid mode is on) */}
      <canvas
        ref={gridCanvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 5,
          pointerEvents: "none",
          display: gridMode ? "block" : "none",
        }}
      />
    </>
  );
}
