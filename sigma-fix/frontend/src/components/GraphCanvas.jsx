
import React, { useEffect, useRef, useContext } from "react";
import Sigma from "sigma";
import Graph from "graphology";
import { GraphContext } from "../GraphContext";
import { addRectangularGrid } from "../pages/rectGrid";
import { addHexLikeGrid } from "../pages/hexGrid";
import { addHopfieldCluster } from "../pages/hopfield";
import { addGridHopfield } from "../pages/gridHopfield";
import { serializeGraph } from "../utils/ioUtils";

// Grid and snapping constants
const GRID_STEP_GU = 25;
const GRID_MIN_GU = -5000;
const GRID_MAX_GU = 5000;

// how many grid cells between neighbors inside templates
const TEMPLATE_CELLS = 2; 
const TEMPLATE_SPACING_GU = GRID_STEP_GU * TEMPLATE_CELLS;

// Helpers that don't depend on component refs 

function clampGU({ x, y }) {
  return {
    x: Math.max(GRID_MIN_GU, Math.min(GRID_MAX_GU, x)),
    y: Math.max(GRID_MIN_GU, Math.min(GRID_MAX_GU, y)),
  };
}

// Find max node index based on labels like "Node 12" so we can continue numbering
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

// largest numeric suffix among existing ids like "n-12"
function getMaxIdSuffix(graph) {
  let maxS = 0;
  graph.nodes().forEach((id) => {
    const m = String(id).match(/^n-(\d+)$/);
    if (m) {
      const k = parseInt(m[1], 10);
      if (k > maxS) maxS = k;
    }
  });
  return maxS;
}

// keep counter ahead of both labels and ids, then return a guaranteed-free id
function uniqueNextIdFactory(graph, nodeIdRef) {
  // sync counter to the max of label index and id suffix
  const maxLabel = getMaxNodeIndex(graph);    
  const maxIdSuf = getMaxIdSuffix(graph);
  nodeIdRef.current = Math.max(maxLabel, maxIdSuf);
  // return unique id generator
  return function nextId() {
    let id;
    do {
      id = `n-${++nodeIdRef.current}`;
    } while (graph.hasNode(id)); // guarantee uniqueness
    return id;
  };
}


function snapGraphGU(x, y) {
  const step = GRID_STEP_GU;
  const sx = Math.round(x / step) * step;
  const sy = Math.round(y / step) * step;
  return clampGU({ x: sx, y: sy });
}

function snapViewportToGraph(vx, vy, sigma) {
  // Convert to graph, then snap in GU so grid scales with zoom
  const g = sigma.viewportToGraph({ x: vx, y: vy });
  return snapGraphGU(g.x, g.y);
}

function toGridIJ({ x, y }) {
  const step = GRID_STEP_GU;
  return { i: Math.round(x / step), j: Math.round(y / step) };
}

function fromGridIJ({ i, j }) {
  const step = GRID_STEP_GU;
  return clampGU({ x: i * step, y: j * step });
}

function setSnappedNode(graph, id, pos) {
  const snapped = snapGraphGU(pos.x, pos.y);
  const { i, j } = toGridIJ(snapped);
  const p = fromGridIJ({ i, j });
  graph.setNodeAttribute(id, "x", p.x);
  graph.setNodeAttribute(id, "y", p.y);
  graph.setNodeAttribute(id, "gridI", i);
  graph.setNodeAttribute(id, "gridJ", j);
}

// Snap only the nodes that were *newly* added (after `beforeSet`)
function snapNewNodesIfGrid({ graph, sigma, beforeSet, gridMode }) {
  if (!gridMode) return;
  const after = new Set(graph.nodes());
  after.forEach((id) => {
    if (beforeSet.has(id)) return; // only newly added
    const a = graph.getNodeAttributes(id);
    setSnappedNode(graph, id, { x: a.x, y: a.y });
  });
}

// Tiny nudge of a just-added group so extreme corners sit exactly on grid
function shiftGroupOntoGrid({ graph, ids }) {
  const step = GRID_STEP_GU;
  if (!ids || !ids.length) return;

  // pick extremes (corners)
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  ids.forEach((id) => {
    const a = graph.getNodeAttributes(id);
    if (a.x < minX) minX = a.x;
    if (a.x > maxX) maxX = a.x;
    if (a.y < minY) minY = a.y;
    if (a.y > maxY) maxY = a.y;
  });

  // minimal correction that maps extremes to nearest grid intersections
  const corr = (v) => {
    const r = ((v % step) + step) % step; // remainder in [0, step)
    return r <= step / 2 ? -r : step - r;
  };

  const dx = corr(maxX); // lock rightmost edge
  const dy = corr(minY); // and top edge (change to maxY to lock bottom)
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return;

  ids.forEach((id) => {
    const a = graph.getNodeAttributes(id);
    graph.setNodeAttribute(id, "x", a.x + dx);
    graph.setNodeAttribute(id, "y", a.y + dy);
  });
}

// ==== Optional network utilities used for custom templates ====
function normalizeEdgeEndpoints(edge) {
  const s =
    edge.source ?? edge.from ?? edge.src ?? edge.u ?? edge.sourceId ?? edge.s;
  const t =
    edge.target ?? edge.to ?? edge.dst ?? edge.v ?? edge.targetId ?? edge.t;
  return [s, t];
}

function isSquareMatrix(m) {
  return (
    Array.isArray(m) &&
    m.length > 0 &&
    m.every((row) => Array.isArray(row) && row.length === m.length)
  );
}

function isSymmetric01(m) {
  if (!isSquareMatrix(m)) return false;
  const n = m.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if ((m[i][j] ? 1 : 0) !== (m[j][i] ? 1 : 0)) return false;
    }
  }
  return true;
}

function computeLayoutAnchor(nodesArray) {
  const pts = nodesArray
    .map((n) => ({ x: n?.x ?? null, y: n?.y ?? null }))
    .filter((p) => p.x !== null && p.y !== null);

  if (pts.length === 0) return { x: 0, y: 0 };
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { x: cx, y: cy };
}

function fallbackCirclePos(idx, count, radius = 120) {
  const t = (2 * Math.PI * idx) / Math.max(1, count);
  return { x: radius * Math.cos(t), y: radius * Math.sin(t) };
}

export default function GraphCanvas({
  mode,
  gridMode,
  nodeSizePreset,
  connectionProb,
  hopfieldCount,
  rectRows,
  rectCols,
  hexRows,
  hexCols,
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

  const modeRef = useRef(mode);
  const gridRef = useRef(gridMode);
  const nodeSizeRef = useRef(5);

  const connectionProbRef = useRef(connectionProb);
  const hopfieldCountRef = useRef(hopfieldCount);
  const rectRowsRef = useRef(rectRows);
  const rectColsRef = useRef(rectCols);
  const hexRowsRef = useRef(hexRows);
  const hexColsRef = useRef(hexCols);

  const objectTypeRef = useRef(objectType);
  const selectedTemplateRef = useRef(selectedTemplate);
  const customTemplatesRef = useRef(customTemplates);

  // updates for refs
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    gridRef.current = gridMode;
  }, [gridMode]);
  useEffect(() => {
    nodeSizeRef.current =
      nodeSizePreset === "small" ? 4 : nodeSizePreset === "large" ? 8 : 5;
  }, [nodeSizePreset]);
  useEffect(() => {
    connectionProbRef.current = connectionProb;
  }, [connectionProb]);
  useEffect(() => {
    hopfieldCountRef.current = hopfieldCount;
  }, [hopfieldCount]);
  useEffect(() => {
    rectRowsRef.current = rectRows;
  }, [rectRows]);
  useEffect(() => {
    rectColsRef.current = rectCols;
  }, [rectCols]);
  useEffect(() => {
    hexRowsRef.current = hexRows;
  }, [hexRows]);
  useEffect(() => {
    hexColsRef.current = hexCols;
  }, [hexCols]);
  useEffect(() => {
    objectTypeRef.current = objectType;
  }, [objectType]);
  useEffect(() => {
    selectedTemplateRef.current = selectedTemplate;
  }, [selectedTemplate]);
  useEffect(() => {
    customTemplatesRef.current = customTemplates;
  }, [customTemplates]);

  // Allow controlled position writes (guard)
  const allowPosWritesRef = useRef(false);
  function withPositionWrites(fn) {
    allowPosWritesRef.current = true;
    try {
      fn();
    } finally {
      allowPosWritesRef.current = false;
    }
  }

  // ===== Grid drawing =====
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

    // compute visible graph bounds
    const stepGU = GRID_STEP_GU;
    const topLeftG = sigma.viewportToGraph({ x: 0, y: 0 });
    const botRightG = sigma.viewportToGraph({ x: width, y: height });
    const minX = Math.min(topLeftG.x, botRightG.x);
    const maxX = Math.max(topLeftG.x, botRightG.x);
    const minY = Math.min(topLeftG.y, botRightG.y);
    const maxY = Math.max(topLeftG.y, botRightG.y);

    const startX = Math.floor(minX / stepGU) * stepGU;
    const startY = Math.floor(minY / stepGU) * stepGU;

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;

    // verticals
    for (let gx = startX; gx <= maxX; gx += stepGU) {
      const v0 = sigma.graphToViewport({ x: gx, y: minY });
      const v1 = sigma.graphToViewport({ x: gx, y: maxY });
      ctx.beginPath();
      ctx.moveTo(v0.x, v0.y);
      ctx.lineTo(v1.x, v1.y);
      ctx.stroke();
    }
    // horizontals
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

  // ===== Custom network placement for user templates =====
function placeCustomNetworkAt(graph, p, name, network, nextId, shouldSnap = false, connectionProb = 100) {
    const nodesArray = network.layout || network.nodes || [];
    const rawEdges = network.edges || network.links || network.arcs || [];
    const matrix = network.C;

    // synthesize ids if missing
    nodesArray.forEach((node, idx) => {
      if (!node.id && !node.key && !node.name && !node.label) node.id = idx;
    });

    // compute anchor so the template lands at the cursor
    const anchor = computeLayoutAnchor(nodesArray);
    const dx = p.x - anchor.x;
    const dy = p.y - anchor.y;

    // maps
    const idxToNew = [];
    const keyToNew = {};

    // 1) add nodes (recentered)
    nodesArray.forEach((node, idx) => {
      const id = nextId();
      idxToNew[idx] = id;
      const key = node.id ?? node.key ?? node.name ?? node.label ?? idx;
      keyToNew[String(key)] = id;

      // if layout missing x/y, place around p on a small circle
      const hasPos = node?.x !== undefined && node?.y !== undefined;
      const local = hasPos
        ? { x: node.x, y: node.y }
        : fallbackCirclePos(idx, nodesArray.length);

      graph.addNode(id, {
        x: local.x + dx,
        y: local.y + dy,
        size: nodeSizeRef.current,
        color: "#48dbfb",
        label: `Node ${nodeIdRef.current}`,
        templateName: name,
      });

      // ✅ Snap imported nodes if grid mode is active
      if (shouldSnap) setSnappedNode(graph, id, { x: local.x + dx, y: local.y + dy });
    });

    // 2) edges from explicit list (if any)
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
          graph.addEdge(src, dst, {
            color: "rgba(255,255,255,0.08)",
            templateName: name,
          });
          anyEdge = true;
        } catch {}
      }
    });

    // 3) or from adjacency matrix C
    if (!anyEdge && Array.isArray(matrix) && matrix.length) {
      const n = matrix.length;
      const symmetric = isSymmetric01(matrix);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (!matrix[i][j]) continue;
          if (symmetric && j <= i) continue; // avoid duplicates
          const src = idxToNew[i],
            dst = idxToNew[j];
          if (src && dst && src !== dst && Math.random() * 100 < connectionProb) {
            try {
              graph.addEdge(src, dst, {
                color: "rgba(255,255,255,0.08)",
                templateName: name,
              });
            } catch {}
          }
        }
      }
    }
  }

  // ===== Main mount effect: create sigma, hooks, events =====
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

    // Guard against uncontrolled pos writes
    const guardHandler = ({ key, name, previous }) => {
      if ((name === "x" || name === "y") && !allowPosWritesRef.current) {
        graph.setNodeAttribute(key, name, previous);
      }
    };
    graph.on("nodeAttributesUpdated", guardHandler);

    // Camera/rescale settings
    sigma.setSetting("autoRescale", false);
    sigma.setSetting("autoRescaleOnNewNodes", false);
    sigma.setSetting("autoRescaleOnNewEdges", false);
    sigma.setSetting("autoRescaleOnResize", false);

    // hidden anchors for bounds
    if (!graph.hasNode("__anchor1")) {
      graph.addNode("__anchor1", {
        x: -5000,
        y: -5000,
        hidden: true,
        isAnchor: true,
      });
      graph.addNode("__anchor2", {
        x: 5000,
        y: 5000,
        hidden: true,
        isAnchor: true,
      });
    }

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
    let dragOffsets = {}; // id -> {dx, dy} (freeform)
    let startCursorIJ = null; // for grid dragging
    let nodeStartPos = {}; // id -> {x, y} at drag start
    const mc = sigma.getMouseCaptor();

    const endDrag = () => {
      if (!draggedNode) return;

      withPositionWrites(() => {
        if (gridRef.current) {
          const type = objectTypeRef.current;
          // Keep template shape intact — we've already moved by whole grid steps
          if (type !== "template") {
            draggedGroup.forEach((id) => {
              const a = graph.getNodeAttributes(id);
              setSnappedNode(graph, id, { x: a.x, y: a.y });
            });
          }
        }
      });

      draggedGroup.forEach((id) =>
        graph.setNodeAttribute(id, "color", "#48dbfb")
      );
      draggedNode = null;
      draggedGroup = [];
      dragOffsets = {};
      cam.enable();
      sigma.refresh();
    };

    const onDownNode = ({ node, event }) => {
      const mode = modeRef.current;

      if (mode === "drag") {
        draggedNode = node;
        cam.disable();

        const type = objectTypeRef.current;
        if (type === "template") {
          // BFS collect connected component
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

        draggedGroup.forEach((id) =>
          graph.setNodeAttribute(id, "color", "#38a8c2ff")
        );

        const startPos = sigma.viewportToGraph({ x: event.x, y: event.y });
        dragOffsets = {};
        draggedGroup.forEach((id) => {
          const attrs = graph.getNodeAttributes(id);
          dragOffsets[id] = {
            dx: attrs.x - startPos.x,
            dy: attrs.y - startPos.y,
          };
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

     if (mode === "delete") {
  const type = objectTypeRef.current;
  const dropSet = new Set();
  const dropComponent = type === "template" || !!event.shiftKey;

  if (dropComponent) {
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
    visited.forEach((n) => dropSet.add(n));
  } else {
    dropSet.add(node);
  }

  withPositionWrites(() => {
    dropSet.forEach((n) => { if (graph.hasNode(n)) graph.dropNode(n); });
  });

  // relabel remaining visible nodes to Node 1..N
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

  // sync counter with what's on canvas
  nodeIdRef.current = ids.length;

  selectedNodeRef.current = null;
  sigma.refresh();
  return;
}


      if (mode === "idle") {
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

        const hasEdge = graph.hasEdge(selected, node);
        if (hasEdge) graph.dropEdge(selected, node);
        else graph.addEdge(selected, node, { color: "rgba(255,255,255,0.08)" });

        graph.setNodeAttribute(selected, "color", "#48dbfb");
        graph.setNodeAttribute(node, "color", "#48dbfb");
        selectedNodeRef.current = null;
        sigma.refresh();
      }
    };

    const onMouseMove = (e) => {
      if (!draggedNode || modeRef.current !== "drag") return;

      if (gridRef.current && startCursorIJ) {
        const p = sigma.viewportToGraph({ x: e.x, y: e.y });
        const snapped = snapGraphGU(p.x, p.y);
        const curIJ = toGridIJ(snapped);
        const di = curIJ.i - startCursorIJ.i;
        const dj = curIJ.j - startCursorIJ.j;

        // move as whole grid steps
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
        // freeform drag
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
              snapNewNodesIfGrid({
                graph,
                sigma,
                beforeSet: before,
                gridMode: gridRef.current,
              });
              // optional: nudge whole component to perfect corners
              const newIds = [];
              graph.forEachNode((id) => {
                if (!before.has(id) && !graph.getNodeAttribute(id, "isAnchor"))
                  newIds.push(id);
              });
              shiftGroupOntoGrid({ graph, ids: newIds });
            });
          } else {
            withPositionWrites(() =>
              addHopfieldCluster({
                graph,
                cx: p.x,
                cy: p.y,
                count: parseInt(hopfieldCountRef.current, 10) || 12,
                radius: 120,
                nodeSize: nodeSizeRef.current,
                nextId,
                connectionProb: parseFloat(connectionProbRef.current) || 100,
              })
            );
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
            snapNewNodesIfGrid({
              graph,
              sigma,
              beforeSet: before,
              gridMode: gridRef.current,
            });
            const newIds = [];
            graph.forEachNode((id) => {
              if (!before.has(id) && !graph.getNodeAttribute(id, "isAnchor"))
                newIds.push(id);
            });
            shiftGroupOntoGrid({ graph, ids: newIds });
          });
        } else if (name.includes("Hexagonal")) {
          const rows = Math.max(1, parseInt(hexRowsRef.current || "4", 10));
          const cols = Math.max(1, parseInt(hexColsRef.current || "6", 10));
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
              caps: true, // half-columns for proper corner reach
            });
            snapNewNodesIfGrid({
              graph,
              sigma,
              beforeSet: before,
              gridMode: gridRef.current,
            });
            const newIds = [];
            graph.forEachNode((id) => {
              if (!before.has(id) && !graph.getNodeAttribute(id, "isAnchor"))
                newIds.push(id);
            });
            shiftGroupOntoGrid({ graph, ids: newIds });
          });
        } else {
          const custom = customTemplatesRef.current.find(
            (t) => t.name === name && t.data
          );
          if (custom) {
            withPositionWrites(() => {
              placeCustomNetworkAt(graph, p, name, custom.data, nextId, gridRef.current, parseFloat(connectionProbRef.current) || 100);
            });
          }
        }

        // ensure labels after batch
        let maxNum = nodeIdRef.current;
        graph.forEachNode((id, attrs) => {
          if (attrs.isAnchor || attrs.hidden) return;
          if (!attrs.label || attrs.label.startsWith("n-")) {
            maxNum++;
            graph.setNodeAttribute(id, "label", `Node ${maxNum}`);
          }
        });
        nodeIdRef.current = maxNum;

        sigma.refresh();
      }
    };

    sigma.on("downNode", onDownNode);
    sigma.on("upNode", endDrag);
    sigma.on("clickStage", onClickStage);
    mc.on("mousemove", onMouseMove);
    mc.on("mouseup", endDrag);
    mc.on("leave", endDrag);

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

  // ===== Load saved network once (if present) =====
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    if (!network || !Array.isArray(network.C) || !Array.isArray(network.layout)) {
      return;
    }

    // if already has visible nodes, don't overwrite
    const visibleNodes = graph
      .nodes()
      .filter((id) => !graph.getNodeAttribute(id, "hidden"));
    if (visibleNodes.length > 0) return;

    if (!graph.hasNode("__anchor1")) {
      graph.addNode("__anchor1", { x: -5000, y: -5000, hidden: true });
      graph.addNode("__anchor2", { x: 5000, y: 5000, hidden: true });
    }

    const N = network.C.length;
    const idxToId = [];

    for (let i = 0; i < N; i++) {
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

    const matrix = network.C;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
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

    // wipe entire graph
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
          if (e.dataTransfer.types.includes("application/x-template-name")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={(e) => {
          const nameLocal = e.dataTransfer.getData(
            "application/x-template-name"
          );
          if (!nameLocal) return;
          e.preventDefault();
          const sigma = sigmaRef.current;
          if (!sigma) return;

          const p = gridRef.current
            ? snapViewportToGraph(e.clientX, e.clientY, sigma)
            : sigma.viewportToGraph({ x: e.clientX, y: e.clientY });

          const graph = graphRef.current;
          const before = new Set(graph.nodes());
          const nextId = uniqueNextIdFactory(graph, nodeIdRef);

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
              const rows = Math.max(
                1,
                parseInt(rectRowsRef.current || "3", 10)
              );
              const cols = Math.max(
                1,
                parseInt(rectColsRef.current || "4", 10)
              );
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
            } else if (nameLocal.includes("Hexagonal")) {
              const rows = Math.max(1, parseInt(hexRowsRef.current || "4", 10));
              const cols = Math.max(1, parseInt(hexColsRef.current || "6", 10));
              addHexLikeGrid({
                graph,
                cx: p.x,
                cy: p.y,
                rows,
                cols,
                spacing: TEMPLATE_SPACING_GU,
                nodeSize: nodeSizeRef.current,
                nextId,
                caps: true,
              });
            } else {
              const custom = customTemplatesRef.current.find(
                (t) => t.name === nameLocal && t.data
              );
              if (custom) {
                placeCustomNetworkAt(graph, p, nameLocal, custom.data, nextId, parseFloat(connectionProbRef.current) || 100);
              }
            }

            // snap new nodes if grid and nudge to perfect corner lock
            snapNewNodesIfGrid({
              graph,
              sigma,
              beforeSet: before,
              gridMode: gridRef.current,
            });

            if (gridRef.current) {
              const newIds = [];
              graph.forEachNode((id) => {
                if (!before.has(id) && !graph.getNodeAttribute(id, "isAnchor"))
                  newIds.push(id);
              });
              shiftGroupOntoGrid({ graph, ids: newIds });
            }
          });

          sigma.refresh();
        }}
      />
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
