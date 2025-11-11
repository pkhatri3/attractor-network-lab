import React, { useEffect, useRef, useState, useContext } from "react";
import Sigma from "sigma";
import Graph from "graphology";
import { Link } from "react-router-dom";
import { GraphContext } from "../GraphContext";
import "./Sandbox.css";
import { addRectangularGrid } from "./rectGrid";
import { addHexLikeGrid } from "./hexGrid";



const API_URL = import.meta.env.VITE_API_URL;

export default function Sandbox() {
  const { network, setNetwork } = useContext(GraphContext);
  const [template, setTemplate] = useState("hopfield"); // "hopfield" | "rect" | "hex"

  const containerRef = useRef(null);
  const gridCanvasRef = useRef(null);
  const graphRef = useRef(new Graph({ type: "undirected" }));
  const sigmaRef = useRef(null);
  const firstNodeRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState("idle");
  const modeRef = useRef("idle");

  const [gridMode, setGridMode] = useState(false);
  const gridRef = useRef(false);

  const [nodeSizePreset, setNodeSizePreset] = useState("medium");
  const nodeSizeRef = useRef(5);

  const [hopfieldCount, setHopfieldCount] = useState("12");
  const hopfieldCountRef = useRef("12");

  const nodeIdRef = useRef(0);
  const [cluster, setCluster] = useState(null);

  const [showResize, setShowResize] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [handlePos, setHandlePos] = useState({ x: 0, y: 0 });
  const [rectMode, setRectMode] = useState(false);      
  const [rectRows, setRectRows] = useState("3");
  const [rectCols, setRectCols] = useState("4");
  const rectRowsRef = useRef("3");
  const rectColsRef = useRef("4");
  const [hexRows, setHexRows] = useState("4");
  const [hexCols, setHexCols] = useState("6");
  const hexRowsRef = useRef("4");
  const hexColsRef = useRef("6");

  // Keep refs in sync
  useEffect(() => { rectRowsRef.current = rectRows; }, [rectRows]);
  useEffect(() => { rectColsRef.current = rectCols; }, [rectCols]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { gridRef.current = gridMode; }, [gridMode]);
  useEffect(() => {
    nodeSizeRef.current = nodeSizePreset === "small" ? 4 :
                          nodeSizePreset === "large" ? 8 : 5;
  }, [nodeSizePreset]);
  useEffect(() => { hopfieldCountRef.current = hopfieldCount; }, [hopfieldCount]);

  useEffect(() => { hexRowsRef.current = hexRows; }, [hexRows]);
  useEffect(() => { hexColsRef.current = hexCols; }, [hexCols]);

  // Sigma setup and context restore
  useEffect(() => {
    const container = containerRef.current;
    const graph = graphRef.current;
    if (!container) return;

    // Restore saved network (if any) when graph is empty
    if (network && graph.order === 0) {
      const N = network.N ?? 0;
      const layout = network.layout || [];

      for (let i = 0; i < N; i++) {
        const id = `n-${i + 1}`;
        const pos = layout[i] || { x: i * 60, y: 0 };
        graph.addNode(id, {
          x: pos.x,
          y: pos.y,
          size: nodeSizeRef.current,
          color: "#48dbfb",
          label: id,
        });
      }
      const C = network.C || [];
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          if (C[i] && C[i][j] === 1) {
            const a = `n-${i + 1}`;
            const b = `n-${j + 1}`;
            if (!graph.hasEdge(a, b)) graph.addEdge(a, b, { color: "white" });
          }
        }
      }
      nodeIdRef.current = N;
    }

    const sigmaInstance = new Sigma(graph, container, {
      renderLabels: false,
      allowInvalidContainer: true,
      settings: { mouseEnabled: true, enableCamera: true },
    });
    sigmaRef.current = sigmaInstance;

    let draggedNode = null;

    // Node drag color + camera disable while dragging
    sigmaInstance.on("downNode", ({ node }) => {
      draggedNode = node;
      const color = firstNodeRef.current === node ? "orange" : "#38a8c2ff";
      graph.setNodeAttribute(node, "color", color);
      sigmaInstance.getCamera().disable();
      sigmaInstance.refresh();
    });

    sigmaInstance.on("upNode", () => {
      if (draggedNode) {
        const color = firstNodeRef.current === draggedNode ? "orange" : "#48dbfb";
        graph.setNodeAttribute(draggedNode, "color", color);
        draggedNode = null;
        sigmaInstance.refresh();
      }
      sigmaInstance.getCamera().enable();
    });

    // Drag to move (with optional snapping)
    sigmaInstance.getMouseCaptor().on("mousemove", (e) => {
      if (!draggedNode) return;
      const pos = sigmaInstance.viewportToGraph(e);
      const ratio = sigmaInstance.getCamera().getState().ratio;
      const step = 25 / Math.max(ratio, 1e-6);
      const useGrid = gridRef.current;
      const x = useGrid ? Math.round(pos.x / step) * step : pos.x;
      const y = useGrid ? Math.round(pos.y / step) * step : pos.y;
      graph.setNodeAttribute(draggedNode, "x", x);
      graph.setNodeAttribute(draggedNode, "y", y);
      sigmaInstance.refresh();
    });

    // Click to connect / toggle edge or delete node
    sigmaInstance.on("clickNode", ({ node }) => {
      if (modeRef.current === "delete") {
        if (graph.hasNode(node)) {
          graph.dropNode(node);
          // Fixed bug, reset selection if deleted node was selected
          if (firstNodeRef.current === node) {
            firstNodeRef.current = null;
          }
        }
        sigmaInstance.refresh();
        return;
      }
      if (!firstNodeRef.current) {
        firstNodeRef.current = node;
        graph.setNodeAttribute(node, "color", "orange");
      } else if (firstNodeRef.current === node) {
        graph.setNodeAttribute(node, "color", "#48dbfb");
        firstNodeRef.current = null;
      } else {
        if (!graph.hasEdge(firstNodeRef.current, node)) {
          graph.addEdge(firstNodeRef.current, node, { color: "white" });
        } else {
          graph.dropEdge(firstNodeRef.current, node);
        }
        graph.setNodeAttribute(firstNodeRef.current, "color", "#48dbfb");
        firstNodeRef.current = null;
      }
      sigmaInstance.refresh();
    });

    // Canvas clicks: Add node or spawn Hopfield ring
    const handleCanvasClick = (e) => {
      const pos = sigmaInstance.viewportToGraph(e);
      const currentMode = modeRef.current;

      if (currentMode === "add") {
        const ratio = sigmaInstance.getCamera().getState().ratio;
        const step = 25 / Math.max(ratio, 1e-6);
        const useGrid = gridRef.current;
        const x = useGrid ? Math.round(pos.x / step) * step : pos.x;
        const y = useGrid ? Math.round(pos.y / step) * step : pos.y;
        nodeIdRef.current += 1;
        const id = `n-${nodeIdRef.current}`;
        graph.addNode(id, { x, y, size: nodeSizeRef.current, color: "#48dbfb", label: id });
        sigmaInstance.refresh();
        return;
      }

      if (currentMode === "hopfield") {
        const n = Math.max(
          2,
          parseInt((hopfieldCountRef.current && hopfieldCountRef.current.trim()) || "4", 10)
        );
        const ratio = sigmaInstance.getCamera().getState().ratio;
        const step = 25 / Math.max(ratio, 1e-6);
        const useGrid = gridRef.current;
        const centerX = useGrid ? Math.round(pos.x / step) * step : pos.x;
        const centerY = useGrid ? Math.round(pos.y / step) * step : pos.y;

        const nodes = [];
        const radius = 120 / ratio;
        const offsetAngle = -Math.PI / 2;
        for (let i = 0; i < n; i++) {
          const angle = (2 * Math.PI * i) / n + offsetAngle;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          nodeIdRef.current += 1;
          const id = `n-${nodeIdRef.current}`;
          graph.addNode(id, { x, y, size: nodeSizeRef.current, color: "#48dbfb", label: id });
          nodes.push(id);
        }
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            graph.addEdge(nodes[i], nodes[j], { color: "white" });
          }
        }
        setCluster({ ids: nodes, center: { x: centerX, y: centerY }, radius });
        setShowResize(true);
        sigmaInstance.refresh();
        setMode("idle");
        return;
      }
      if (currentMode === "rect") {
        
        const rows = Math.max(1, parseInt((rectRowsRef.current && rectRowsRef.current.trim()) || "3", 10));
        const cols = Math.max(1, parseInt((rectColsRef.current && rectColsRef.current.trim()) || "4", 10));

        const ratio = sigmaInstance.getCamera().getState().ratio;
        const step = 25 / Math.max(ratio, 1e-6);
        const useGrid = gridRef.current;

        const centerX = useGrid ? Math.round(pos.x / step) * step : pos.x;
        const centerY = useGrid ? Math.round(pos.y / step) * step : pos.y;

        // spacing between lattice points
        const spacing = 60 / Math.max(ratio, 1e-6);

        // function to create incremental ids that keeps nodeIdRef in sync
        const nextId = () => {
          nodeIdRef.current += 1;
          return `n-${nodeIdRef.current}`;
        };

        addRectangularGrid({
          graph,
          cx: centerX,
          cy: centerY,
          rows,
          cols,
          spacing,
          nodeSize: nodeSizeRef.current,
          nextId,
        });

        sigmaInstance.refresh();
        setMode("idle");
        return;
      }
      if (currentMode === "hex") {
        const rows = Math.max(1, parseInt((hexRowsRef.current && hexRowsRef.current.trim()) || "4", 10));
        const cols = Math.max(1, parseInt((hexColsRef.current && hexColsRef.current.trim()) || "6", 10));

        const ratio = sigmaInstance.getCamera().getState().ratio;
        const step = 25 / Math.max(ratio, 1e-6);
        const useGrid = gridRef.current;

        const centerX = useGrid ? Math.round(pos.x / step) * step : pos.x;
        const centerY = useGrid ? Math.round(pos.y / step) * step : pos.y;

        const spacing = 60 / Math.max(ratio, 1e-6);

        const nextId = () => {
          nodeIdRef.current += 1;
          return `n-${nodeIdRef.current}`;
        };

        addHexLikeGrid({
          graph,
          cx: centerX,
          cy: centerY,
          rows,
          cols,
          spacing,
          nodeSize: nodeSizeRef.current,
          nextId,
        });

  sigmaInstance.refresh();
  setMode("idle");
  return;
}


    };

    sigmaInstance.getMouseCaptor().on("click", handleCanvasClick);

    return () => {
      sigmaInstance.kill();
    };
  }, [network]);

  // Keep resize handle positioned for Hopfield ring
  useEffect(() => {
    if (!cluster || !sigmaRef.current) return;
    const update = () => {
      const p = sigmaRef.current.graphToViewport({
        x: cluster.center.x + cluster.radius,
        y: cluster.center.y,
      });
      if (p && typeof p.x === "number") setHandlePos({ x: p.x, y: p.y });
    };
    update();
    const cam = sigmaRef.current.getCamera();
    cam.on("updated", update);
    return () => cam.off("updated", update);
  }, [cluster]);

  // Drag ring radius
  useEffect(() => {
    if (!resizing || !cluster || !sigmaRef.current) return;

    const onMove = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      const vp = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const gpos = sigmaRef.current.viewportToGraph(vp);

      const dx = gpos.x - cluster.center.x;
      const dy = gpos.y - cluster.center.y;
      const r = Math.max(10, Math.sqrt(dx * dx + dy * dy));

      const graph = graphRef.current;
      const n = cluster.ids.length;
      const offsetAngle = -Math.PI / 2;

      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n + offsetAngle;
        const x = cluster.center.x + r * Math.cos(angle);
        const y = cluster.center.y + r * Math.sin(angle);
        const id = cluster.ids[i];

        if (graph.hasNode(id)) {
          graph.setNodeAttribute(id, "x", x);
          graph.setNodeAttribute(id, "y", y);
        }
      }
      setCluster({ ...cluster, radius: r });
      sigmaRef.current.refresh();

      const vpNew = sigmaRef.current.graphToViewport({
        x: cluster.center.x + r,
        y: cluster.center.y,
      });
      if (vpNew && typeof vpNew.x === "number") setHandlePos({ x: vpNew.x, y: vpNew.y });
    };

    const onUp = () => setResizing(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing, cluster]);

  useEffect(() => {
    if (!sigmaRef.current) return;
    const canvas = gridCanvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // size canvas
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // clear
      ctx.clearRect(0, 0, width, height);

      if (!gridRef.current) return;

      const sigma = sigmaRef.current;
      const spacingPx = 25; // fixed screen-space spacing
      const originVp = sigma.graphToViewport({ x: 0, y: 0 });
      const offsetX = ((originVp.x % spacingPx) + spacingPx) % spacingPx;
      const offsetY = ((originVp.y % spacingPx) + spacingPx) % spacingPx;

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;

      // vertical lines
      for (let x = offsetX; x <= width; x += spacingPx) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      // horizontal lines
      for (let y = offsetY; y <= height; y += spacingPx) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    const cam = sigmaRef.current.getCamera();
    cam.on("updated", draw);
    window.addEventListener("resize", draw);
    draw(); // initial

    return () => {
      cam.off("updated", draw);
      window.removeEventListener("resize", draw);
    };
  }, []);

  // Redraw/clear immediately when toggling grid
  useEffect(() => {
    if (!sigmaRef.current) return;
    const canvas = gridCanvasRef.current;
    if (!canvas) return;

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

    if (!gridMode) return;

    // force a draw via camera event
    sigmaRef.current.getCamera().emit("updated");
  }, [gridMode]);

  // Clear all nodes/edges
  const clearAll = () => {
    const graph = graphRef.current;
    graph.clear();
    nodeIdRef.current = 0;
    firstNodeRef.current = null;
    setCluster(null);
    setShowResize(false);
    sigmaRef.current?.refresh();
    // also clear grid canvas if visible
    if (gridRef.current) {
      const cvs = gridCanvasRef.current;
      if (cvs) {
        const ctx = cvs.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, cvs.width, cvs.height);
      }
    }
  };

  // Cursor based on mode
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (mode === "add" || mode === "hopfield") el.style.cursor = "crosshair";
    else if (mode === "delete") el.style.cursor = "not-allowed";
    else el.style.cursor = "default";
  }, [mode]);

  return (
    <>
      {/* Menu button */}
      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Open tools menu"
        style={{
          position: "absolute", top: 12, left: 12, zIndex: 20,
          width: 44, height: 44, borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(20,20,26,0.75)", color: "#eaf4ff",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.35)", backdropFilter: "blur(8px)"
        }}
      >
        <div style={{ width: 20 }}>
          <div style={{ height: 2, background: "#eaf4ff", margin: "3px 0", opacity: 0.9 }} />
          <div style={{ height: 2, background: "#eaf4ff", margin: "3px 0", opacity: 0.9 }} />
          <div style={{ height: 2, background: "#eaf4ff", margin: "3px 0", opacity: 0.9 }} />
        </div>
      </button>

      {/* Grid toggle */}
      <button
        onClick={() => setGridMode((g) => !g)}
        aria-pressed={gridMode}
        style={{
          position: "absolute", top: 12, right: 12, zIndex: 20,
          padding: "10px 12px", borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: gridMode ? "#1a6fd6" : "rgba(20,20,26,0.75)",
          color: "#eaf4ff", cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)", backdropFilter: "blur(8px)"
        }}
      >
        {gridMode ? "Switch to freeform" : "Switch to grid"}
      </button>

      {/* Learning Phase button */}
      <Link
        to="/learning"
        onClick={() => setNetwork(serializeGraph(graphRef.current))}
        style={{
          position: "absolute", top: 60, right: 12, zIndex: 20,
          padding: "10px 12px", borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "#1a6fd6", color: "#eaf4ff",
          textDecoration: "none", cursor: "pointer", fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)", backdropFilter: "blur(8px)"
        }}
      >
        Go to Learning
      </Link>

  

      {/* Tools menu */}
      {menuOpen && (
        <div
          style={{
            position: "absolute", top: 64, left: 12, zIndex: 19, width: 300,
            padding: 12, borderRadius: 16, background: "rgba(20,20,26,0.92)",
            border: "1px solid rgba(255,255,255,0.1)", color: "#eaf4ff",
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)", backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Graph Tools</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, opacity: 0.8, width: 72 }}>Node size</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setNodeSizePreset("small")}
                  aria-pressed={nodeSizePreset === "small"}
                  style={{
                    padding: "6px 10px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: nodeSizePreset === "small" ? "#1a6fd6" : "rgba(255,255,255,0.06)",
                    color: "#eaf4ff", cursor: "pointer",
                  }}
                >Small</button>
                <button
                  onClick={() => setNodeSizePreset("medium")}
                  aria-pressed={nodeSizePreset === "medium"}
                  style={{
                    padding: "6px 10px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: nodeSizePreset === "medium" ? "#1a6fd6" : "rgba(255,255,255,0.06)",
                    color: "#eaf4ff", cursor: "pointer",
                  }}
                >Medium</button>
                <button
                  onClick={() => setNodeSizePreset("large")}
                  aria-pressed={nodeSizePreset === "large"}
                  style={{
                    padding: "6px 10px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: nodeSizePreset === "large" ? "#1a6fd6" : "rgba(255,255,255,0.06)",
                    color: "#eaf4ff", cursor: "pointer",
                  }}
                >Large</button>
              </div>
            </div>
            <button
              onClick={() => setMode(mode === "add" ? "idle" : "add")}
              aria-pressed={mode === "add"}
              style={{
                padding: "10px 12px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: mode === "add" ? "#1a6fd6" : "rgba(255,255,255,0.06)",
                color: "#eaf4ff", cursor: "pointer", textAlign: "left",
              }}
            >Add Node (A)</button>
            <button
              onClick={() => setMode(mode === "delete" ? "idle" : "delete")}
              aria-pressed={mode === "delete"}
              style={{
                padding: "10px 12px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: mode === "delete" ? "#1a6fd6" : "rgba(255,255,255,0.06)",
                color: "#eaf4ff", cursor: "pointer", textAlign: "left",
              }}
            >Delete (D)</button>

            {/* template dropdown for easy user exploration */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontWeight: 550, opacity: 0.8 }}>Template</div>
              {/* template selector */}
              <select
                value={template}
                onChange={(e) => {
                  const val = e.target.value;
                  setTemplate(val);
                  setMode(val); 
                }}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#eaf4ff",
                  cursor: "pointer",
                }}
              >
                {/* options that the template has */}
                <option value="hopfield" style={{ color: "#000" }}>Hopfield</option>
                <option value="rect" style={{ color: "#000" }}>Rectangular Connectivity</option>
                <option value="hex" style={{ color: "#000" }}>Hexagonal Connectivity</option>
              </select>

              {/* when template is hopfield */}
              {template === "hopfield" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, opacity: 0.8, whiteSpace: "nowrap" }}>Nodes</span>
                  <input
                    type="number"
                    min={2}
                    value={hopfieldCount}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.currentTarget.select()}
                    onChange={(e) => setHopfieldCount(e.target.value.replace(/[^0-9]/g, ""))}
                    style={{ width: 100, padding: "8px 10px", borderRadius: 10 }}
                  />
                </div>
              )}

              {/* when template is rectangular */}
              {template === "rect" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>Rows</span>
                    <input
                      type="number"
                      min={1}
                      value={rectRows}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.currentTarget.select()}
                      onChange={(e) => setRectRows(e.target.value.replace(/[^0-9]/g, ""))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 10 }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>Cols</span>
                    <input
                      type="number"
                      min={1}
                      value={rectCols}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.currentTarget.select()}
                      onChange={(e) => setRectCols(e.target.value.replace(/[^0-9]/g, ""))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 10 }}
                    />
                  </div>
                </div>
              )}
              {/* when template is hexagonal */}
              {template === "hex" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>Rows</span>
                    <input
                      type="number"
                      min={1}
                      value={hexRows}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.currentTarget.select()}
                      onChange={(e) => setHexRows(e.target.value.replace(/[^0-9]/g, ""))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 10 }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>Cols</span>
                    <input
                      type="number"
                      min={1}
                      value={hexCols}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.currentTarget.select()}
                      onChange={(e) => setHexCols(e.target.value.replace(/[^0-9]/g, ""))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 10 }}
                    />
                  </div>
                </div>
              )}
            </div>

          {/* Clear all button */}
            <button
              onClick={clearAll}
              style={{
                padding: "10px 12px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#eaf4ff", cursor: "pointer", textAlign: "left",
              }}
            >Clear All (C)</button>
          </div>
        </div>
      )}

<div

      
      ref={containerRef}
      className={`sandbox-container ${
        ["add", "hopfield", "rect", "hex"].includes(mode)
          ? "mode-draw"
          : mode === "delete"
          ? "mode-delete"
          : ""
      }`}
    />
      <canvas
        ref={gridCanvasRef}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          zIndex: 5, pointerEvents: "none",
          display: gridMode ? "block" : "none",
        }}
      />
    </>
  );
}

// Converting graph to adjacency matrix C and also layout for restoration
export function serializeGraph(graph) {
  const nodes = graph.nodes();
  const N = nodes.length;

  // where id -> index
  const indexMap = {};
  nodes.forEach((id, idx) => { indexMap[id] = idx; });

  // adjacency
  const C = Array.from({ length: N }, () => Array(N).fill(0));

  // layout (we do this to save positions to redraw the same later)
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
