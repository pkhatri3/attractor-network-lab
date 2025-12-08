import React, { useState, useContext, useEffect } from "react";
import { GraphContext } from "../GraphContext";
import { LearningContext } from "../LearningContext";
import { Link } from "react-router-dom";
import LayoutPicker from "../components/LayoutPicker";
import MemoryImporter from "../components/MemoryImporter";

import LearningColorSchemePicker from "../components/LearningColorSchemePicker";
import LearningLegendBar from "../components/LearningLegendBar";
import { getColormap } from "../components/Learningcolormaps";
import { encodeMatrixToBase64 } from "../utils/ioUtils";
import { styles } from "../styles/learningPhaseStyles";


window.__API_URL__ = import.meta.env.VITE_API_URL;
const API_URL = import.meta.env.VITE_API_URL;


export default function LearningPhase() {
  const { network } = useContext(GraphContext); 
  const {
    WHist,
    setWHist,
    memories,
    setMemories,
    rule,
    setRule,
    learningRate,
    setLearningRate,
    scale,
    setScale,
    layoutChoice,
    setLayoutChoice,
    memList,
    setMemList,
    learningComplete,
    setLearningComplete,
    markLearningRun,
    learningColorScheme,
    setLearningColorScheme,
    setNetworkId,
    backend,
    setBackend,
  } = useContext(LearningContext);

  // Local UI state
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);
  const [pickerKey, setPickerKey] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [range, setRange] = useState({ min: NaN, max: NaN });
  const [randomCount, setRandomCount] = useState(1);
  const [lastRunMeta, setLastRunMeta] = useState(null);
  const [isLearning, setIsLearning] = useState(false);
  const [learningStatus, setLearningStatus] = useState("");
  const [allowDiagonal, setAllowDiagonal] = useState(false);
  const [useCoarseView, setUseCoarseView] = useState(true);
  const [weightStats, setWeightStats] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (WHist && WHist.length > 0) {
      const last = WHist.length - 1;
      setCurrentStep((prev) => (prev === last ? prev : last));
    }
  }, [WHist]);

  

  function parseMemoriesSafe(str) {
    try {
      const p = JSON.parse(str);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  function shouldCoarsen(matrix) {
    if (
      !Array.isArray(matrix) ||
      !matrix.length ||
      !Array.isArray(matrix[0])
    ) {
      return false;
    }
    const rows = matrix.length;
    const cols = matrix[0].length;

    
    return useCoarseView && (rows > 64 || cols > 64);
  }

  function buildCoarseMatrix(matrix, targetSize = 64) {
    if (!matrix || !matrix.length || !matrix[0].length) return matrix;

    const rows = matrix.length;
    const cols = matrix[0].length;

    const outRows = Math.min(targetSize, rows);
    const outCols = Math.min(targetSize, cols);

    const coarse = new Array(outRows);
    for (let r = 0; r < outRows; r++) {
      coarse[r] = new Array(outCols);
      const rowStart = Math.floor((r * rows) / outRows);
      const rowEnd = Math.floor(((r + 1) * rows) / outRows);

      for (let c = 0; c < outCols; c++) {
        const colStart = Math.floor((c * cols) / outCols);
        const colEnd = Math.floor(((c + 1) * cols) / outCols);

        let sum = 0;
        let count = 0;
        for (let i = rowStart; i < rowEnd; i++) {
          const row = matrix[i];
          for (let j = colStart; j < colEnd; j++) {
            sum += row[j];
            count++;
          }
        }
        coarse[r][c] = count > 0 ? sum / count : 0;
      }
    }

    return coarse;
  }

function computeWeightStats(matrix) {
  if (!matrix || !matrix.length || !matrix[0].length) return null;

  const rows = matrix.length;
  const cols = matrix[0].length;
  const total = rows * cols;

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let sumSq = 0;
  let pos = 0;
  let neg = 0;
  let zero = 0;

  for (let r = 0; r < rows; r++) {
    const row = matrix[r];
    for (let c = 0; c < cols; c++) {
      const v = row[c];
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
      sumSq += v * v;
      if (v > 0) pos++;
      else if (v < 0) neg++;
      else zero++;
    }
  }

  const mean = sum / total;
  const variance = sumSq / total - mean * mean;
  const std = Math.sqrt(Math.max(0, variance));

  return {
    min,
    max,
    mean,
    std,
    posPct: (pos / total) * 100,
    negPct: (neg / total) * 100,
    zeroPct: (zero / total) * 100,
  };
}

  function WeightsCanvas({
    matrix,
    size = 500,
    scaleFactor = 2,
    colorMapName = "blueWhiteRed",
    onComputedRange,
  }) {
    const canvasRef = React.useRef();
    const backRef = React.useRef();
    const [showNumbers, setShowNumbers] = React.useState(true);
    const SHOW_NUMBERS_LIMIT = 40; 
    const COARSEN_THRESHOLD = 128;
    const COARSE_SIZE = 64; 

    React.useEffect(() => {
      if (!matrix || !matrix.length || !matrix[0].length) return;
      const srcRows = matrix.length;
      const srcCols = matrix[0].length;
      let renderMatrix = matrix;
      let rows = srcRows;
      let cols = srcCols;

      const isLarge = srcRows > COARSEN_THRESHOLD || srcCols > COARSEN_THRESHOLD;
      if (isLarge) {
        renderMatrix = buildCoarseMatrix(matrix, COARSE_SIZE);
        rows = renderMatrix.length;
        cols = renderMatrix[0].length;
      }

      
      if (rows > SHOW_NUMBERS_LIMIT || cols > SHOW_NUMBERS_LIMIT) {
        if (showNumbers) {
          setShowNumbers(false);
        }
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const back =
        backRef.current || (backRef.current = document.createElement("canvas"));
      const bctx = back.getContext("2d");

      const dpr = window.devicePixelRatio || 1;
      ctx.imageSmoothingEnabled = false;
      bctx.imageSmoothingEnabled = false;

      const dispW = size;
      const dispH = size;
      const sf = Math.max(1, scaleFactor || 1);

      const outW = Math.floor(dispW * sf);
      const outH = Math.floor(dispH * sf);

      canvas.width = Math.floor(dispW * sf * dpr);
      canvas.height = Math.floor(dispH * sf * dpr);
      canvas.style.width = `${dispW}px`;
      canvas.style.height = `${dispH}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      back.width = outW;
      back.height = outH;

      bctx.clearRect(0, 0, outW, outH);
      ctx.clearRect(0, 0, outW, outH);

      let min = Infinity,
        max = -Infinity;
      const total = rows * cols;

      if (total <= 200_000) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const v = renderMatrix[r][c];
            if (v < min) min = v;
            if (v > max) max = v;
          }
        }
      } else {
        const samples = Math.min(100_000, total);
        for (let i = 0; i < samples; i++) {
          const r = (i * 9301 + 49297) % rows;
          const c = (i * 23333 + 777) % cols;
          const v = renderMatrix[r][c];
          if (v < min) min = v;
          if (v > max) max = v;
        }
        if (!isFinite(min) || !isFinite(max)) {
          min = -1;
          max = 1;
        }
      }

      if (onComputedRange) {
        onComputedRange((prev) => {
          if (prev && prev.min === min && prev.max === max) return prev;
          return { min, max };
        });
      }

      const cmap = getColormap(colorMapName);
      const lut = cmap.lut;
      const center = cmap.isDiverging ? cmap.center ?? 0 : null;
      const maxAbs = cmap.isDiverging
        ? Math.max(Math.abs(min - (center ?? 0)), Math.abs(max - (center ?? 0)), 1e-9)
        : null;

      function mapColor(v) {
        let t;
        if (cmap.isDiverging) {
          t = ((v - (center ?? 0)) / (2 * maxAbs)) + 0.5;
        } else {
          t = (v - min) / Math.max(1e-9, max - min);
        }
        if (!isFinite(t)) t = 0.5;
        t = Math.min(1, Math.max(0, t));
        const idx = Math.min(
          lut.length - 1,
          Math.max(0, Math.round(t * (lut.length - 1)))
        );
        return lut[idx];
      }

      const img = bctx.createImageData(outW, outH);
      const data = img.data;
      let p = 0;

      for (let y = 0; y < outH; y++) {
        const rIdx = Math.floor((y * rows) / outH);
        const row = renderMatrix[rIdx];
        for (let x = 0; x < outW; x++) {
          const cIdx = Math.floor((x * cols) / outW);
          const v = row[cIdx];
          const [R, G, B] = mapColor(v);
          data[p++] = R;
          data[p++] = G;
          data[p++] = B;
          data[p++] = 255;
        }
      }
      bctx.putImageData(img, 0, 0);

      const cellW_px = outW / cols;
      const cellH_px = outH / rows;
      if (rows <= 100 && cols <= 100 && cellW_px >= 12 && cellH_px >= 12) {
        const snap = (v) => Math.round(v);
        bctx.save();
        bctx.strokeStyle = "rgba(0,0,0,0.35)";
        bctx.lineWidth = 1;
        bctx.beginPath();
        for (let r = 1; r < rows; r++) {
          const y = snap(r * cellH_px);
          bctx.moveTo(0, y);
          bctx.lineTo(outW, y);
        }
        for (let c = 1; c < cols; c++) {
          const x = snap(c * cellW_px);
          bctx.moveTo(x, 0);
          bctx.lineTo(x, outH);
        }
        bctx.stroke();
        bctx.restore();
      }

      const canDrawNumbers = showNumbers && rows <= SHOW_NUMBERS_LIMIT && cols <= SHOW_NUMBERS_LIMIT;
      if (canDrawNumbers) {
        bctx.textAlign = "center";
        bctx.textBaseline = "middle";
        const fontPx = Math.max(10, Math.floor(cellH_px * 0.4));
        bctx.font = `${fontPx}px monospace`;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const val = renderMatrix[r][c];
            const [R, G, B] = mapColor(val);
            const luminance = 0.299 * R + 0.587 * G + 0.114 * B;
            bctx.fillStyle = luminance < 128 ? "#fff" : "#000";
            const cx = c * cellW_px + cellW_px / 2;
            const cy = r * cellH_px + cellH_px / 2;
            bctx.fillText(Number(val).toFixed(1), cx, cy);
          }
        }
      }

      ctx.clearRect(0, 0, outW, outH);
      ctx.drawImage(back, 0, 0, outW, outH);
    }, [matrix, size, scaleFactor, colorMapName, onComputedRange, showNumbers]);

    const downloadAsPNG = () => {
      const url = canvasRef.current.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "weights.png";
      a.click();
    };

    const downloadAsJSON = () => {
      const blob = new Blob([JSON.stringify(matrix)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "weights.json";
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div
        style={{
          textAlign: "center",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          minHeight: 520,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            border: "1px solid #444",
            borderRadius: 8,
            width: "500px",
            height: "500px",
            flexShrink: 0,
          }}
        />

        <div
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "center",
            gap: 8,
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          <button onClick={downloadAsPNG}>Download PNG</button>
          <button onClick={downloadAsJSON}>Download JSON</button>

          {matrix &&
            matrix.length <= SHOW_NUMBERS_LIMIT &&
            matrix[0].length <= SHOW_NUMBERS_LIMIT && (
              <button onClick={() => setShowNumbers((v) => !v)}>
                {showNumbers ? "Hide Numbers" : "Show Numbers"}
              </button>
            )}
        </div>
      </div>
    );
  }

  const baseMemories = parseMemoriesSafe(memories);
  const neuronCount =
    Array.isArray(network?.C) && Array.isArray(network?.C[0])
      ? network.C.length
      : Array.isArray(network?.C)
      ? network.C.length
      : 0;
  const derivedMemList =
    Array.isArray(memList) && memList.length > 0
      ? memList
      : baseMemories;

  const memCount = Array.isArray(derivedMemList) ? derivedMemList.length : 0;
  const memWidth =
    memCount > 0 && Array.isArray(derivedMemList[0])
      ? derivedMemList[0].length
      : neuronCount || 0;
  const currentMatrix =
    WHist && WHist.length > 0 ? WHist[Math.min(currentStep, WHist.length - 1)] : null;
  
  

  const vizN = currentMatrix ? currentMatrix.length : 0;
  let vizModeLabel = "";
  if (vizN > 0) {
    if (vizN <= 64) {
      vizModeLabel = "Detailed matrix view";
    } else if (vizN <= 256) {
      vizModeLabel = "Dense heatmap view";
    } else {
      vizModeLabel = "Coarsened heatmap view";
    }
  }
  useEffect(() => {
    if (currentMatrix) {
      setWeightStats(computeWeightStats(currentMatrix));
    } else {
      setWeightStats(null);
    }
  }, [currentMatrix]);

  useEffect(() => {
    if (!isLearning) {
      setProgress(0);
      return;
    }

    let value = 0;
    const interval = setInterval(() => {
      
      value = Math.min(0.9, value + 0.02);
      setProgress(value);
    }, 200); 

    return () => clearInterval(interval);
  }, [isLearning]);



  async function beginLearning() {
    try {
      setError(null);
      setLearningComplete(false);
      setLearningStatus("");

      if (!network?.C) {
        setError("No network available from Construction phase.");
        return;
      }
      if (!API_URL) {
        setError("VITE_API_URL missing in .env.local");
        return;
      }

      const Nnet = network.C.length;

      const source =
        Array.isArray(memList) && memList.length > 0 ? memList : baseMemories;

      if (!Array.isArray(source) || !source.length) {
        setError("No memories loaded. Import or build some first.");
        return;
      }

      const memWidth = source[0]?.length ?? 0;
      if (Nnet > 0 && memWidth !== Nnet) {
        setError(
          `Neuron count mismatch: memories use ${memWidth}, network expects ${Nnet}.`
        );
        return;
      }

      const payload = {
        memories: source.map((r) => r.map((v) => (v === 1 ? 1 : -1))),
        N: network.C.length,
        C_b64: encodeMatrixToBase64(network.C),
        learning_rate: learningRate,
        scale,
        rule,
        allow_diag: allowDiagonal,
        backend,
        view_layout: layoutChoice
          ? { rows: layoutChoice.rows, cols: layoutChoice.cols }
          : null,
      };

      setProgress(0);
      setIsLearning(true);
      setLearningStatus("Learning in progress…");
      const start = performance.now();            

      const res = await fetch(`${API_URL}/learn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Backend error: ${res.status}`);

      const data = await res.json();

      if (data.ok && data.network_id) {
        setNetworkId(data.network_id);
      }
            if (data.W_hist) {
              const end = performance.now();
              const elapsedMs = end - start;

              
              const finalMatrix = data.W_hist[data.W_hist.length - 1];
              const stats = computeWeightStats(finalMatrix);

              setWHist(data.W_hist);
              setCurrentStep(data.W_hist.length - 1);
              setLearningComplete(true);
              setProgress(1);
              markLearningRun();
              setLearningStatus(
                `Learning complete (${data.W_hist.length} step${
                  data.W_hist.length === 1 ? "" : "s"
                }).`
              );

              setLastRunMeta({
                memCount: source.length,
                neuronCount: Nnet,
                rule,
                elapsedSec: elapsedMs / 1000,
                wMin: stats?.min,
                wMax: stats?.max,
                wMean: stats?.mean,
              });


      
      } else {
        setError("No W_hist returned from backend.");
        setLearningStatus("Learning failed: no weights returned.");
      }
    } catch (err) {
      console.error("Learning error:", err);
      setError(err.message);
      setLearningComplete(false);
      setLearningStatus("Learning failed. Check console / backend logs.");
    } finally {
      setIsLearning(false);
    }

  }
  function getEffectiveMemories() {
      if (Array.isArray(memList) && memList.length > 0) {
        return memList;
      }
      const parsed = parseMemoriesSafe(memories);
      return Array.isArray(parsed) ? parsed : [];
    }
    function exportMemoriesAsJSON() {
      try {
        const source = getEffectiveMemories();
        if (!source.length) {
          setError("No memories to export. Build or import some first.");
          return;
        }
        const blob = new Blob(
          [
            JSON.stringify(
              {
                neuronCount: source[0].length,
                memoryCount: source.length,
                memories: source,
              },
              null,
              2
            ),
          ],
          { type: "application/json" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "memories.json";
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Export JSON error:", e);
        setError("Failed to export memories as JSON.");
      }
    }

    function exportMemoriesAsCSV() {
      try {
        const source = getEffectiveMemories();
        if (!source.length) {
          setError("No memories to export. Build or import some first.");
          return;
        }

        
        const lines = source.map((row) => row.join(","));
        const blob = new Blob([lines.join("\n")], {
          type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "memories.csv";
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Export CSV error:", e);
        setError("Failed to export memories as CSV.");
      }
    }




  return (
    <div style={styles.pageRoot}>
            {isLearning && (
              <div style={styles.fullscreenOverlay} aria-modal="true" role="dialog">
                <div style={styles.fullscreenOverlayCard}>
                  <div style={{ fontSize: 34, marginBottom: 10 }}>⏳</div>
                  <div style={styles.fullscreenOverlayTitle}>Learning in progress</div>
                  <div style={styles.fullscreenOverlayText}>
                    We&rsquo;re updating the weight matrix from your memories.
                    For larger networks, this can take a few seconds.
                  </div>
                  {neuronCount > 0 && (
                    <div style={styles.fullscreenOverlayMeta}>
                      {neuronCount} neurons •{" "}
                      {Array.isArray(memList) && memList.length > 0
                        ? `${memList.length} memories`
                        : "memories loaded"}
                    </div>
                  )}

                  <div style={{ marginTop: 16, width: "100%" }}>
                    <div
                      style={{
                        width: "100%",
                        height: 8,
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.12)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.round(progress * 100)}%`,
                          borderRadius: 999,
                          background:
                            "linear-gradient(90deg, #1a6fd6, #4fd1c5)",
                          transition: "width 0.2s ease-out",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        opacity: 0.8,
                        textAlign: "right",
                      }}
                    >
                      {Math.round(progress * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            )}


      <h1 style={{ marginBottom: 24 }}>Learning Phase</h1>

      <Link to="/" style={styles.navBtnLeft}>
        Back to Construction
      </Link>

      <Link
        to={learningComplete ? "/simulation" : "#"}
        onClick={(e) => !learningComplete && e.preventDefault()}
        style={{
          ...styles.navBtnRight,
          background: learningComplete ? "#1a6fd6" : "#555",
          cursor: learningComplete ? "pointer" : "not-allowed",
          opacity: learningComplete ? 1 : 0.5,
        }}
      >
        Go to Simulation
      </Link>

      <div style={styles.mainContainer}>
        
          <div style={styles.panelLeft}>
              {/* SECTION 1: MEMORIES & LAYOUT */}
              <div style={styles.sectionCard}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <div style={styles.sectionTitle}>Memories & Layout</div>
                    <div style={styles.sectionSubtitle}>
                      The patterns your network will store and how they are arranged.
                    </div>
                  </div>

                  <div style={styles.sectionPill}>
                    {memCount} {memCount === 1 ? "memory" : "memories"}
                    {memWidth > 0 && <> • {memWidth} nodes</>}
                  </div>
                </div>

                {/* TEXTAREA */}
                <div
                  style={{
                    maxHeight: 220,
                    overflowY: "auto",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)",
                    marginBottom: 12,
                  }}
                >
                  <textarea
                    value={memories ?? ""}
                    onChange={(e) => setMemories(e.target.value)}
                    className="mono"
                    style={{
                      ...styles.textarea,
                      border: "none",
                      width: "100%",
                      resize: "none",
                    }}
                    rows={9}
                  />
                </div>

                {/* IMPORTER */}
                <MemoryImporter
                  expectedN={neuronCount}
                  onImportMemories={(parsed, mode) => {
                    let next = parsed;
                    if (mode === "append" && memList.length > 0) {
                      const w = memList[0].length;
                      if (parsed[0]?.length !== w) {
                        alert(
                          `Append failed: imported memories have width ${parsed[0]?.length}, expected ${w}.`
                        );
                        return;
                      }
                      next = [...memList, ...parsed];
                    }
                    setMemList(next);
                    setMemories(JSON.stringify(next, null, 2));
                    setWHist(null);
                    setCurrentStep(0);
                    setPickerKey((k) => k + 1);
                  }}
                />

                {/* RANDOM GENERATOR */}
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={Number.isFinite(randomCount) ? randomCount : ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setRandomCount(NaN);
                        return;
                      }
                      const n = parseInt(raw, 10);
                      if (!Number.isNaN(n)) setRandomCount(Math.max(1, n));
                    }}
                    onBlur={() => {
                      if (!Number.isFinite(randomCount)) setRandomCount(1);
                    }}
                    style={styles.randomCountInput}
                    disabled={!neuronCount}
                  />
                  <button
                    onClick={() => {
                      if (!neuronCount) {
                        setError("Cannot generate memories: neuron count is zero.");
                        return;
                      }
                      const n = Number.isFinite(randomCount)
                        ? Math.max(1, Math.floor(randomCount))
                        : 1;

                      const existing =
                        Array.isArray(memList) && memList.length > 0
                          ? memList
                          : parseMemoriesSafe(memories);

                      const generated = [];
                      for (let i = 0; i < n; i++) {
                        const row = Array.from({ length: neuronCount }, () =>
                          Math.random() < 0.5 ? 1 : -1
                        );
                        generated.push(row);
                      }

                      const combined = [...(Array.isArray(existing) ? existing : []), ...generated];
                      setMemList(combined);
                      setMemories(JSON.stringify(combined, null, 2));
                      setWHist(null);
                      setCurrentStep(0);
                      setPickerKey((k) => k + 1);
                      setError(null);
                    }}
                    style={styles.btnPrimary}
                  >
                    Add Random Memories
                  </button>
                </div>

                {/* LAYOUT PICKER */}
                {neuronCount > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <CollapsibleHeader
                      open={pickerOpen}
                      onToggle={() => setPickerOpen((o) => !o)}
                      layoutChoice={layoutChoice}
                      neuronCount={neuronCount}
                      memCount={memList.length}
                    />
                    {pickerOpen && (
                      <div style={{ marginTop: 10 }}>
                        <LayoutPicker
                          key={pickerKey}
                          neuronCount={neuronCount}
                          value={layoutChoice}
                          onLayoutChange={setLayoutChoice}
                          approxContainerWidth={460}
                          initialMemories={parseMemoriesSafe(memories)}
                          onMemoriesChange={(list) => {
                            setMemList(list);
                            setMemories(JSON.stringify(list, null, 2));
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 11, opacity: 0.85 }}>Export memories:</span>
                  <button
                    type="button"
                    onClick={exportMemoriesAsJSON}
                    style={{ ...styles.btnPrimary, padding: "6px 10px", fontSize: 12 }}
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={exportMemoriesAsCSV}
                    style={{ ...styles.btnPrimary, padding: "6px 10px", fontSize: 12 }}
                  >
                    CSV
                  </button>
                </div>
              </div>

              {/* SECTION 2: LEARNING SETTINGS */}
              <div style={styles.sectionCard}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <div style={styles.sectionTitle}>Learning Settings</div>
                    <div style={styles.sectionSubtitle}>
                      Choose how the network updates and scales its weights.
                    </div>
                  </div>
                </div>

                {/* Learning rate */}
                <div style={{ marginTop: 6 }}>
                  <label style={styles.label}>Learning Rate (μ):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={learningRate}
                    onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                    style={styles.input}
                  />
                </div>

                {/* Learning rule */}
                <div style={{ marginTop: 10 }}>
                  <label style={styles.label}>Learning Rule:</label>
                  <select
                    value={rule}
                    onChange={(e) => setRule(e.target.value)}
                    style={styles.input}
                  >
                    <option style={{ color: "#000" }} value="standard">
                      Standard
                    </option>
                    {backend !== 'jax' && (
                      <option style={{ color: "#000" }} value="iterative">
                        Iterative
                      </option>
                    )}
                    <option style={{ color: "#000" }} value="decay">
                      Decay
                    </option>
                    {backend !== 'jax' && (
                      <>
                        <option style={{ color: "#000" }} value="store_erase">
                          Store–Erase
                        </option>
                        <option style={{ color: "#000" }} value="store_erase_decay">
                          Store–Erase (with decay)
                        </option>
                      </>
                    )}
                  </select>
                </div>

                {/* Backend */}
                <div style={{ marginTop: 10 }}>
                  <label style={styles.label}>Backend:</label>
                  <select
                    value={backend}
                    onChange={(e) => {
                      const newBackend = e.target.value;
                      setBackend(newBackend);
                      if (
                        newBackend === "jax" &&
                        ["iterative", "store_erase", "store_erase_decay"].includes(rule)
                      ) {
                        setRule("standard");
                      }
                    }}
                    style={styles.input}
                  >
                    <option style={{ color: "#000" }} value="numpy">
                      NumPy (Standard)
                    </option>
                    <option style={{ color: "#000" }} value="jax">
                      JAX (Accelerated)
                    </option>
                  </select>
                </div>

                {/* Scale for decay-type rules */}
                {(rule === "decay" || rule === "store_erase_decay") && (
                  <div style={{ marginTop: 10 }}>
                    <label style={styles.label}>Scale:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      style={styles.input}
                    />
                  </div>
                )}

                {/* Allow diagonal */}
                <div style={{ marginTop: 10 }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allowDiagonal}
                      onChange={(e) => setAllowDiagonal(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <span>Allow non-zero diagonal in W</span>
                  </label>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.7,
                      marginLeft: 22,
                      marginTop: 2,
                    }}
                  >
                    When off, W<sub>ii</sub> = 0 for all i.
                  </div>
                </div>
              </div>



            {/* SECTION 3: RUN LEARNING */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeaderRow}>
                <div>
                  <div style={styles.sectionTitle}>Run Learning</div>
                  <div style={styles.sectionSubtitle}>
                    Apply updates and compute weight matrix W.
                  </div>
                </div>
              </div>

              <button
                onClick={beginLearning}
                style={{
                  ...styles.btnPrimary,
                  width: "100%",
                  opacity: isLearning ? 0.7 : 1,
                  cursor: isLearning ? "wait" : "pointer",
                }}
                disabled={isLearning}
              >
                {isLearning ? "Learning…" : "Begin Learning"}
              </button>

              {error && (
                <p
                  style={{
                    color: "#ff6b6b",
                    marginTop: 8,
                    fontSize: 12,
                  }}
                >
                  {error}
                </p>
              )}
            </div>
          </div>

        {/* Right: Visualization */}
          <div style={styles.panelRight}>
           {WHist && WHist.length > 0 ? (
            <>
              <h2>
                Weight Matrix W (Step {currentStep + 1}/{WHist.length})
              </h2>

              {vizN > 0 && (
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.75,
                    marginTop: 4,
                    marginBottom: 8,
                  }}
                >
                  {vizModeLabel} • N = {vizN}
                </div>
              )}

              <WeightsCanvas
                matrix={currentMatrix}
                colorMapName={learningColorScheme}
                onComputedRange={setRange}
              />

              <LearningLegendBar
                min={range.min}
                max={range.max}
                mapName={learningColorScheme}
              />

              <input
                type="range"
                min={0}
                max={WHist.length - 1}
                value={currentStep}
                onChange={(e) => setCurrentStep(parseInt(e.target.value, 10))}
                style={{ width: "100%", marginTop: 16 }}
              />
              

                <div style={{ marginTop: 20, textAlign: "center" }}>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#eaf4ff",
                      marginBottom: 10,
                      letterSpacing: "0.5px",
                    }}
                  >
                    Color Scheme
                  </h3>
                </div>

                <div style={styles.colorSchemeGrid}>
                  {[
                    "blueWhiteRed",
                    "viridis",
                    "plasma",
                    "magma",
                    "inferno",
                    "cividis",
                  ].map((scheme) => (
                    <div
                      key={scheme}
                      onClick={() => setLearningColorScheme(scheme)}
                      style={{
                        ...styles.colorSchemeCard,
                        border:
                          learningColorScheme === scheme
                            ? "2px solid #1a6fd6"
                            : "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      
                      <div
                        style={{
                          ...styles.colorSchemePreview,
                          backgroundImage:
                            scheme === "blueWhiteRed"
                              ? "linear-gradient(to right, blue, white, red)"
                              : scheme === "viridis"
                              ? "linear-gradient(to right, #440154, #31688e, #35b779, #fde725)"
                              : scheme === "plasma"
                              ? "linear-gradient(to right, #0d0887, #7e03a8, #cc4778, #f0f921)"
                              : scheme === "magma"
                              ? "linear-gradient(to right, #000004, #51127c, #b73779, #fcfdbf)"
                              : scheme === "inferno"
                              ? "linear-gradient(to right, #000004, #420a68, #932667, #f0f921)"
                              : "linear-gradient(to right, #30123b, #4145ab, #27ad81, #f4e33a)",
                        }}
                      />
                      <span style={styles.colorSchemeLabel}>{scheme}</span>
                    </div>
                  ))}
                  
                </div>

                
                {lastRunMeta && (
                  <div
                    style={{
                      marginTop: 20,
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#eaf4ff",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
                      Learning Summary
                    </div>

                    <div>
                      • Memories learned: <strong>{lastRunMeta.memCount}</strong>
                    </div>
                    <div>
                      • Neurons: <strong>{lastRunMeta.neuronCount}</strong>
                    </div>
                    <div>
                      • Rule: <strong>{lastRunMeta.rule}</strong>{" "}
                      ({allowDiagonal ? "diagonal allowed" : "diagonal zeroed"})
                    </div>

                    {Number.isFinite(lastRunMeta.elapsedSec) && (
                      <div>
                        • Runtime:{" "}
                        <strong>{lastRunMeta.elapsedSec.toFixed(2)} s</strong>
                      </div>
                    )}
                    {Number.isFinite(range.min) && Number.isFinite(range.max) && (
                      <>
                        <div>
                          • W min / max:{" "}
                          <strong>{range.min.toFixed(3)}</strong> to{" "}
                          <strong>{range.max.toFixed(3)}</strong>
                        </div>
                      </>
                    )}

                  </div>
                )}
                {weightStats && (
                  <div
                    style={{
                      marginTop: 12,
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#eaf4ff",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
                      Weight Summary
                    </div>
                    <div>
                      • min: <strong>{weightStats.min.toFixed(3)}</strong>, max:{" "}
                      <strong>{weightStats.max.toFixed(3)}</strong>
                    </div>
                    <div>
                      • mean: <strong>{weightStats.mean.toFixed(3)}</strong>, std:{" "}
                      <strong>{weightStats.std.toFixed(3)}</strong>
                    </div>
                    <div>
                      • positive:{" "}
                      <strong>{weightStats.posPct.toFixed(1)}%</strong>, negative:{" "}
                      <strong>{weightStats.negPct.toFixed(1)}%</strong>, zero:{" "}
                      <strong>{weightStats.zeroPct.toFixed(1)}%</strong>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={styles.matrixPlaceholder}>
                Matrix will appear here after learning
              </div>
            )}
          </div>
         </div>
       </div>
              
            );
          }

function CollapsibleHeader({ open, onToggle, layoutChoice, neuronCount, memCount }) {
  const chev = open ? "▼" : "▶";
  const layoutSummary = layoutChoice
    ? `${layoutChoice.rows}×${layoutChoice.cols}${
        layoutChoice.pad ? ` (pad ${layoutChoice.pad})` : ""
      }`
    : `${neuronCount} nodes`;
  return (
    <button onClick={onToggle} style={styles.collapseBtn}>
      <span>{chev} Memories & Layout</span>
      <span style={{ opacity: 0.8, fontSize: 12 }}>
        {memCount} {memCount === 1 ? "memory" : "memories"} • {layoutSummary}
      </span>
    </button>
  );
}
