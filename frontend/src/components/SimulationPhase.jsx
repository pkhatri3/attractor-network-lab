import React, { useState, useContext, useEffect, useRef } from "react";
import { GraphContext } from "../GraphContext";
import { LearningContext } from "../LearningContext";
import { SimulationContext } from "../SimulationContext";
import StatePicker from "./StatePicker";
import StateImporter from "../components/StateImporter";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getColormap } from "../components/Learningcolormaps";
import { encodeMatrixToBase64 } from "../utils/ioUtils";
import {
  generateReportPdf
} from "./reportGenerator";

const API_URL = import.meta.env.VITE_API_URL;

const ActivationLayout = ({
    inputMode,
    setInputMode,
    isSimulating,
    hasRun,
    capacityTestActive,
    canSimulate,
    onStartSimulation,
    handleReset,
    neuronCount,
    Atext,
    setAtext,
    handleTextChange,
    Avec,
    setAvec,
    AHist,
    iter,
    energyHist,
    granularMode,
    setGranularMode,
    AHistLength,
    onIterationChange,
  }) => (
    <div style={{ width: "100%", paddingTop: "20px", display: "flex", flexDirection: "column", gap: 4, pointerEvents: "auto", zIndex: 1 }}>
      
      {/* activation simulation controls */}
      <div style={{
        background: "rgba(20,20,26,0.92)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "97%",
        flexShrink: 0,
        minHeight: 0,
      }}>
        <div style={{ display: "flex", flexDirection: "row", gap: 20, width: "100%" }}>
          <div style={{ width: "180px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 12, color: "#ccc", fontWeight: 700 }}>Activations Display Format</div>

            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => setInputMode("text")}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: inputMode === "text" ? "2px solid #1a6fd6" : "1px solid #ccc",
                  background: inputMode === "text" ? "#1a6fd6" : "transparent",
                  color: inputMode === "text" ? "#fff" : "#eaf4ff",
                  cursor: capacityTestActive ? "not-allowed" : "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Text
              </button>

              <button
                onClick={() => setInputMode("matrix")}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: inputMode === "matrix" ? "2px solid #1a6fd6" : "1px solid #ccc",
                  background: inputMode === "matrix" ? "#1a6fd6" : "transparent",
                  color: inputMode === "matrix" ? "#fff" : "#eaf4ff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Matrix
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#eaf4ff" }}>
              <input
                type="checkbox"
                checked={granularMode}
                onChange={(e) => setGranularMode(e.target.checked)}
                disabled={isSimulating || hasRun}
                style={{ cursor: "pointer" }}
              />
              <span>Granular Updates</span>
            </div>

            <button
              onClick={onStartSimulation}
              disabled={!canSimulate || isSimulating || hasRun}
              style={{
                padding: 8,
                borderRadius: 8,
                background:
                  canSimulate && !isSimulating && !hasRun ? "#1a6fd6" : "#555",
                color: "#fff",
                fontWeight: 600,
                cursor:
                  canSimulate && !isSimulating && !hasRun ? "pointer" : "not-allowed",
              }}
            >
              Start
            </button>

            <button
              onClick={handleReset}
              disabled={!isSimulating && !hasRun}
              style={{
                padding: 8,
                borderRadius: 8,
                background: isSimulating || hasRun ? "#1a6fd6" : "#555",
                cursor: isSimulating || hasRun ? "pointer" : "not-allowed",
                color: "#fff",
                fontWeight: 600,
              }}
            >
              Reset
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: "1 1 0px",
              minWidth: 0,
            }}
          >
            {inputMode === "text" ? (
              <>
                <div style={{ width: "82%", display: "flex", justifyContent: "center" }}>
                  <StateImporter
                    expectedN={neuronCount}
                    disabled={isSimulating || hasRun}
                    onImportState={(row) => {
                      if (!isSimulating && !hasRun) {
                        setAvec(row);
                        setAtext(JSON.stringify(row));
                      }
                    }}
                  />
                </div>

                <textarea
                  value={Atext}
                  onChange={(e) => handleTextChange(e.target.value)}
                  rows={6}
                  disabled={isSimulating || hasRun}
                  className="mono"
                  style={{
                    width: "80%",
                    padding: 8,
                    borderRadius: 10,
                    marginTop: 10,
                    background: "rgba(255,255,255,0.06)",
                    color: "#eaf4ff",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />

                <div style={{ marginTop: 8, fontSize: 13, color: "#aaa" }}>
                  Iteration {iter}
                </div>
              </>
            ) : (
            <div
              style={{
                width: "100%",
                overflowX: "auto",
                paddingBottom: 4,
              }}
            >
              <div style={{ minWidth: 480 }}>
                <StatePicker
                  neuronCount={neuronCount}
                  externalState={(isSimulating || hasRun) && AHist[iter] ? AHist[iter] : null}
                  cursor={(isSimulating || hasRun) ? 'not-allowed' : 'pointer'}
                  approxContainerWidth={480}
                  initialState={Avec}
                  disabled={isSimulating || hasRun}
                  iteration={(isSimulating || hasRun) ? iter : null}
                  onStateChange={(newState) => {
                    if (!isSimulating && !hasRun) {
                      setAvec(newState);
                      setAtext(JSON.stringify(newState));
                    }
                  }}
                />
              </div>
            </div>
            )}
          </div>
        </div>

        {AHistLength > 0 &&
          onIterationChange &&
          !isSimulating &&
          hasRun && (
            <div style={{ width: "100%" }}>
              <div
                style={{
                  fontSize: 12,
                  color: "#aaa",
                  marginBottom: 4,
                }}
              >
                View iteration: {iter} / {AHistLength - 1}
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, AHistLength - 1)}
                value={iter}
                onChange={(e) =>
                  onIterationChange(Number(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
          )}
      </div>
      
      {/* Energy graph */}
      <div style={{ ...panel, position: "relative", overflow: "visible" }}>
        <h3 style={{ marginTop: 0 }}>Network Energy</h3>

              {energyHist.length ? (
          <>
            <div
              style={{
                width: "100%",
                height: 250,
                minWidth: 0,
                minHeight: 200,
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={energyHist.map((E, t) => ({ t, E }))}
                  margin={{ top: 10, right: 20, bottom: 30, left: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="t"
                    label={{
                      value: "Timestep",
                      position: "bottom",
                      dy: 0,
                      marginTop: "50px",
                      fill: "#999",
                      offset: 10,
                    }}
                    tick={{ fill: "#999" }}
                  />
                  <YAxis
                    label={{
                      value: "Energy",
                      angle: -90,
                      position: "left",
                      dy: -25,
                      fill: "#999",
                    }}
                    tick={{ fill: "#999" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#2a2a2a",
                      border: "1px solid #444",
                    }}
                    labelStyle={{ color: "#fff" }}
                    itemStyle={{ color: "#1a6fd6" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="E"
                    stroke="#1a6fd6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "#666",
              fontStyle: "italic",
            }}
          >
            Run simulation to see energy evolution
          </div>
        )}
      </div>
    </div>
);

const CapacityLayout = ({
    capacityNoiseLevel,
    setCapacityNoiseLevel,
    capacityIterations,
    setCapacityIterations,
    capacityTestActive,
    capacityResults,
    handleRunCapacityTest,
    panel
  }) => (
    <div style={{ width: "96%", marginTop: "20px", display: "flex", flexDirection: "column", gap: 20, border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        padding: 20, }}>
      
      <div style={{
        background: "rgba(20,20,26,0.92)",
        borderRadius: 16,
        padding: 20,
        width: "96%"
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>Memory Capacity Test</h3>
        <h5 style={{ color: "#888", marginTop: 8 }}>Tests how well the network recalls patterns as more memories are added.</h5>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Noise: {(capacityNoiseLevel * 100).toFixed(0)}%</div>
          <input
            type="range"
            min={0}
            max={0.5}
            step={0.01}
            value={capacityNoiseLevel}
            onChange={e => setCapacityNoiseLevel(Number(e.target.value))}
            disabled={capacityTestActive}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Trials per Data Point: {capacityIterations}</div>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={capacityIterations}
            onChange={e => setCapacityIterations(Number(e.target.value))}
            disabled={capacityTestActive}
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
            Number of repeated simulations used to compute an averaged value for each data point.
          </div>
        </div>

        <button
          onClick={handleRunCapacityTest}
          disabled={capacityTestActive}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: capacityTestActive ? "#555" : "#1a6fd6",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            width: "100%"
          }}
        >
          {capacityTestActive ? "Running Test..." : "Run Capacity Test"}
        </button>
      </div>

      {/* Graph */}
      <div style={panel}>
          {capacityTestActive && (
            <span
              style={{
                marginLeft: 12,
                fontSize: 14,
                fontWeight: 400,
                color: "#1a6fd6",
                animation: "pulse 1.5s infinite",
              }}
            >
              Running...
            </span>
          )}

        {capacityResults.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={capacityResults}
              margin={{ top: 10, right: 20, bottom: 40, left: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />

              <XAxis
                dataKey="num_patterns"
                tick={{ fill: "#999" }}
                label={{
                  value: "Number of Patterns",
                  position: "bottom",
                  dy: 10,
                  fill: "#999",
                }}
              />

              <YAxis
                tick={{ fill: "#999" }}
                label={{
                  value: "Successful Recalls",
                  angle: -90,
                  position: "left",
                  dy: -65,
                  fill: "#999",
                }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #444",
                }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#1a6fd6" }}
              />

              <Line
                type="monotone"
                dataKey="success_count"
                stroke="#1a6fd6"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "#666",
              fontStyle: "italic",
            }}
          >
            No capacity test data yet...
          </div>
        )}
      </div>
    </div>
  );

  const RightDrawer = ({
  drawerWidth,
  simulationNoiseLevel,
  setSimulationNoiseLevel,
  setDrawerOpen,
  showW,
  setShowW,
  showMemories,
  setShowMemories,
  selectedMemoryIndex,
  setSelectedMemoryIndex,
  parsedMems,
  currentW,
  finalW,
  wStep,
  setWStep,
  WHistLength,
  learningColorScheme,
  isSimulating,
  hasRun,
  neuronCount,
  simulationMode,
  canSimulate,
  generateNoisyInput,
  onWeightsCanvasReady,
}) => (
  <div
    style={{
      width: drawerWidth,
      height: "100%",
      background: "rgba(20,20,26,0.70)",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.1)",
      padding: 20,
      overflowY: "auto",
      boxSizing: "border-box",
    }}
  >

    {/* W */}
    <div style={panel}>
      <div style={panelHeader} onClick={() => setShowW((w) => !w)}>
        <span
          style={{
            transform: showW ? "rotate(90deg)" : "rotate(0deg)",
            transition: "0.2s",
          }}
        >
          ▶
        </span>
        <h3>W</h3>
      </div>
      {showW && (
  <div style={{ marginTop: 12 }}>
    {currentW ? (
      <>
        {/* Step label like in Learning phase */}
        <div
          style={{
            fontSize: 12,
            opacity: 0.8,
            marginBottom: 6,
          }}
        >
          Weight Matrix W (Step {wStep + 1}/{WHistLength || 1})
        </div>

        {/* Matrix heatmap */}
        <WeightsCanvas
          matrix={currentW}
          size={300}
          cmapName={learningColorScheme || "blueWhiteRed"}
          onCanvasReady={onWeightsCanvasReady}
        />

        {/* Slider to move through WHist */}
        {WHistLength > 1 && (
          <input
            type="range"
            min={0}
            max={WHistLength - 1}
            value={wStep}
            onChange={(e) => setWStep(Number(e.target.value))}
            style={{ width: "100%", marginTop: 10 }}
          />
        )}
      </>
    ) : (
      <p>No weights available.</p>
    )}
  </div>
)}


    </div>

    {/* Memories */}
    <div style={panel}>
      <div style={panelHeader} onClick={() => setShowMemories((m) => !m)}>
        <span
          style={{
            transform: showMemories ? "rotate(90deg)" : "rotate(0deg)",
            transition: "0.2s",
          }}
        >
          ▶
        </span>
        <h3>Memories</h3>
      </div>
      {showMemories && (
        <div style={{ marginTop: 12 }}>
          {parsedMems.length ? (
            <div
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: 12,
                borderRadius: 8,
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {parsedMems.map((m, i) => (
                <div key={i}>
                  #{i + 1}: {JSON.stringify(m)}
                </div>
              ))}
            </div>
          ) : (
            <p>No memories.</p>
          )}
        </div>
      )}
    </div>

    {/* Noisy input */}
    {simulationMode === "activation" && (
      <div style={panel}>
        <h3>Generate Noisy Input</h3>

        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            padding: 10,
            borderRadius: 8,
            width: "94%",
          }}
        >
          <div
            style={{
              fontSize: 13,
              marginBottom: 6,
              fontWeight: 600,
              color: "#eaf4ff",
            }}
          >
            Noise Level: {(simulationNoiseLevel * 100).toFixed(0)}%
          </div>

          <input
            type="range"
            min={0}
            max={0.5}
            step={0.01}
            value={simulationNoiseLevel}
            onChange={(e) => setSimulationNoiseLevel(Number(e.target.value))}
            style={{ width: "100%" }}
            disabled={isSimulating || hasRun}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10,
              opacity: 0.6,
              marginTop: 6,
            }}
          >
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              alignItems: "center",
            }}
          >
            <select
              value={selectedMemoryIndex === null ? "" : selectedMemoryIndex}
              onChange={(e) =>
                setSelectedMemoryIndex(
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              disabled={isSimulating || hasRun || parsedMems.length === 0}
              style={{
                flex: 1,
                padding: 6,
                borderRadius: 6,
                background: "transparent",
                color: "#eaf4ff",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {parsedMems.map((m, i) => (
                <option
                  key={i}
                  value={i}
                  style={{ background: "#FFF", color: "#000" }}
                >
                  Memory #{i + 1}
                </option>
              ))}
            </select>

            <button
              onClick={() => generateNoisyInput()}
              disabled={isSimulating || hasRun || neuronCount === 0}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                fontWeight: 600,
                background:
                  canSimulate && !isSimulating && !hasRun ? "#1a6fd6" : "#555",
                color: "#fff",
                cursor:
                  canSimulate && !isSimulating && !hasRun
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);

function WeightsCanvas({ matrix, size = 500, scaleFactor = 2, cmapName = "blueWhiteRed",onCanvasReady }) {
  const canvasRef = React.useRef();
  const [showNumbers, setShowNumbers] = React.useState(true);
  const cmapInfo = React.useMemo(() => getColormap(cmapName), [cmapName]);
  const lut = cmapInfo.lut; 
  React.useEffect(() => {
    if (!matrix || !matrix.length || !matrix[0].length) return;

    const rows = matrix.length;
    const cols = matrix[0].length;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const dispW = size;
    const dispH = size;
    const sf = Math.max(1, scaleFactor || 1);
    const outW = Math.floor(dispW * sf);
    const outH = Math.floor(dispH * sf);

    canvas.width = outW;
    canvas.height = outH;
    canvas.style.width = `${dispW}px`;
    canvas.style.height = `${dispH}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, outW, outH);

    let min = Infinity,
      max = -Infinity;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = matrix[r][c];
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    if (!isFinite(min)) min = -1;
    if (!isFinite(max)) max = 1;

    const sampleLUT = (v) => {
      const t = max === min ? 0.5 : (v - min) / (max - min);
      const i = Math.max(0, Math.min(255, Math.round(t * 255)));

      return lut[i]; 
    };

    const getRGB = (v) => {
      if (v === 0) return [200, 200, 200];
      if (v > 0) {
        const norm = v / (max || 1);
        return [
          Math.round(200 + 55 * norm),
          Math.round(200 - 200 * norm),
          Math.round(200 - 200 * norm),
        ];
      } else {
        const norm = v / (min || -1);
        return [
          Math.round(200 - 200 * norm),
          Math.round(200 - 200 * norm),
          Math.round(200 + 55 * norm),
        ];
      }
    };

    const img = ctx.createImageData(outW, outH);
    const data = img.data;
    let p = 0;
    for (let y = 0; y < outH; y++) {
      const rIdx = Math.floor((y * rows) / outH);
      const row = matrix[rIdx];
      for (let x = 0; x < outW; x++) {
        const cIdx = Math.floor((x * cols) / outW);
        const v = row[cIdx];
        const [R, G, B] = sampleLUT(v);
        data[p++] = R;
        data[p++] = G;
        data[p++] = B;
        data[p++] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const cellW = outW / cols;
    const cellH = outH / rows;
    const canDrawNumbers =
      showNumbers && rows <= 50 && cols <= 50 && cellW >= 24 && cellH >= 24;

    if (canDrawNumbers) {
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.max(10, Math.floor(cellH * 0.4))}px monospace`;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const val = matrix[r][c];
          const cx = c * cellW + cellW / 2;
          const cy = r * cellH + cellH / 2;
          const [rr, gg, bb] = sampleLUT(val);
          const luminance = 0.2126*(rr/255) + 0.7152*(gg/255) + 0.0722*(bb/255);
          ctx.fillStyle = luminance > 0.5 ? "#000" : "#fff";
          ctx.fillText(Number(val).toFixed(1), cx, cy);
        }
      }
    }

    if (onCanvasReady && canvas) {
      onCanvasReady(canvas);
    }
  }, [matrix, size, scaleFactor, showNumbers, cmapInfo]);

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
    <div style={{ textAlign: "center" }}>
      <canvas
        ref={canvasRef}
        style={{ border: "1px solid #444", borderRadius: 8 }}
      />
      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button onClick={downloadAsPNG}>Download PNG</button>
        <button onClick={downloadAsJSON}>Download JSON</button>
        {matrix &&
          matrix.length * matrix[0].length < 10_000 && (
            <button onClick={() => setShowNumbers((v) => !v)}>
              {showNumbers ? "Hide Numbers" : "Show Numbers"}
            </button>
          )}
      </div>
    </div>
  );
}

export default function SimulationPhase() {
  const { network } = useContext(GraphContext);
  const {
    WHist,
    memories,
    learningColorScheme,
    networkId,
    rule,
    learningRate,
    scale,
  } = useContext(LearningContext);

  const {
    Atext, setAtext,
    Avec, setAvec,
    AHist, setAHist,
    energyHist, setEnergyHist,
    iter, setIter,
    capacityResults, setCapacityResults,
    capacityNoiseLevel, setCapacityNoiseLevel,
    capacityIterations, setCapacityIterations,
    capacityTestActive, setCapacityTestActive,
    simulationNoiseLevel, setSimulationNoiseLevel,
    initialA, setInitialA,
    inputMode, setInputMode,
    isSimulating, setIsSimulating,
    error, setError,
    hasRun, setHasRun,
    simulationMode, setSimulationMode, // "activation" || "capacity"
  } = useContext(SimulationContext);

  const neuronCount = Array.isArray(network?.C) ? network.C.length : 0;
  const [gridCols, setGridCols] = useState(neuronCount);
  const abortRef = useRef(null);
  const [showW, setShowW] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(350); // px
  const [granularMode, setGranularMode] = useState(true);
  const [experimentName, setExperimentName] = useState("");
  const [activationRule, setActivationRule] = useState("Discrete");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportExperimentInput, setReportExperimentInput] = useState("");
  const [reportFileNameInput, setReportFileNameInput] = useState("");
  const weightsCanvasRef = useRef(null);
  const capacityChartRef = useRef(null);
  const [wStep, setWStep] = useState(0); // for stepping through WHist


    const getParsedMemories = () => {
    try {
      if (Array.isArray(memories)) return memories;
      return JSON.parse(memories || "[]");
    } catch {
      return [];
    }
  };


  const handleDrawerResizeStart = (e) => {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = drawerWidth;

  const onMouseMove = (moveEvent) => {
    const delta = startX - moveEvent.clientX; // drag left/right
    let newWidth = startWidth + delta;

    const MIN_DRAWER_WIDTH = 300;   // how skinny the drawer can get
    const MIN_MAIN_WIDTH = 700;     // how skinny the left content is allowed to get

    const viewport = window.innerWidth || document.documentElement.clientWidth;
    const horizontalPadding = 40;
    const available = viewport - horizontalPadding;

    // drawer cannot eat into the main content’s minimum width
    const MAX_DRAWER_WIDTH = Math.max(
      MIN_DRAWER_WIDTH,
      available - MIN_MAIN_WIDTH
    );

    if (newWidth < MIN_DRAWER_WIDTH) newWidth = MIN_DRAWER_WIDTH;
    if (newWidth > MAX_DRAWER_WIDTH) newWidth = MAX_DRAWER_WIDTH;

    setDrawerWidth(newWidth);
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
};



  const handleRunCapacityTest = async () => {
    try {
      if (!network || !network.C) {
        setError("No network available. Complete the Construction and Learning phases first.");
        return;
      }
      if (!API_URL) {
        setError("VITE_API_URL is not set.");
        return;
      }
      if (!WHist || WHist.length === 0) {
        setError("No weights available. Complete the Learning phase first.");
        return;
      }

      setError(null);

      // Parse memories from context
      let parsedMemories;
      try {
        parsedMemories = typeof memories === 'string' ? JSON.parse(memories) : memories;
      } catch {
        setError("Invalid memories format.");
        return;
      }

      if (!Array.isArray(parsedMemories) || parsedMemories.length === 0) {
        setError("No memories loaded. Import memories in the Learning phase first.");
        return;
      }
      
      if (parsedMemories.length < 2) {
        setError("Need at least 2 memories to test capacity.");
        return;
      }

      const Nnet = network.C.length;
      const memWidth = Array.isArray(parsedMemories[0]) ? parsedMemories[0].length : 0;
      if (Nnet > 0 && memWidth !== Nnet) {
        setError(`Neuron count mismatch: memories have ${memWidth} neurons, network expects ${Nnet}.`);
        return;
      }

      // Convert memories to +1/-1 format
      const effectiveMemories = parsedMemories.map(row => 
        row.map(v => (v === 1 ? 1 : -1))
      );

      setCapacityTestActive(true);
      setCapacityResults([]);

      const payload = {
        memories: effectiveMemories,
        N: network.C.length,
        C_b64: encodeMatrixToBase64(network.C),
        learning_rate: 0.25,
        scale: 1.0,
        rule: "standard",
        noise_level: capacityNoiseLevel,
        max_iters: 50,
        iterations: capacityIterations,
        update_type: getUpdateType(activationRule),
      };

      const res = await fetch(`${API_URL}/memory_capacity_test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Backend error: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const results = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.done) {
                setCapacityTestActive(false);
                console.log("Capacity test complete!");
              } else if (parsed.error) {
                setError(parsed.error);
                setCapacityTestActive(false);
              } else if (parsed.num_patterns !== undefined) {
                results.push(parsed);
                setCapacityResults([...results]);
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error during capacity test:", err);
      setError(err.message || "Capacity test failed.");
      setCapacityTestActive(false);
    }
  };

  const parseA = (str) => {
    try {
      const p = JSON.parse(str);
      if (Array.isArray(p) && p.length === neuronCount)
        return p.map((v) => (v === 1 ? 1 : -1));
    } catch {
      return [];
    }
    return [];
  };

  const handleTextChange = (str) => {
    setAtext(str);
    const parsed = parseA(str);
    // If the parsed array doesnt match the expected neuron count then clear Avec
    if (parsed.length === neuronCount) {
      setAvec(parsed);
    } else {
      setAvec([]);
    }
  };

  const [selectedMemoryIndex, setSelectedMemoryIndex] = useState(null);

  const createNoisyCopy = (baseArray, noiseLevel) => {
    if (!Array.isArray(baseArray)) return [];
    const N = baseArray.length;
    const normalized = baseArray.map(v => (v === 1 ? 1 : -1));
    const k = Math.round(noiseLevel * N);
    if (k === 0) return normalized.slice();

    // choose k unique indices to flip
    const indices = Array.from({ length: N }, (_, i) => i);
    // Fisher-Yates shuffle for first k picks
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(Math.random() * (N - i));
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    const out = normalized.slice();
    for (let i = 0; i < k; i++) {
      const idx = indices[i];
      out[idx] = -out[idx];
    }
    return out;
  };

  const generateNoisyInput = () => {
    // recompute parsed memories safely
    let parsedMemsLocal = [];
    try {
      parsedMemsLocal = Array.isArray(memories) ? memories : JSON.parse(memories || "[]");
    } catch {
      parsedMemsLocal = [];
    }

    let base = null;
    if (selectedMemoryIndex === null || selectedMemoryIndex === undefined) {
      // no memory selected (likely no memories available) -> use current Avec or initialA
      if (Array.isArray(Avec) && Avec.length === neuronCount) base = Avec;
      else if (Array.isArray(initialA) && initialA.length === neuronCount) base = initialA;
      else {
        setError('No valid base pattern available to create noisy input. Import a state or provide a memory.');
        return;
      }
    } else {
      const idx = Number(selectedMemoryIndex);
      if (!Array.isArray(parsedMemsLocal) || !parsedMemsLocal[idx]) {
        setError('Selected memory not available');
        return;
      }
      base = parsedMemsLocal[idx];
    }

    if (!Array.isArray(base) || base.length !== neuronCount) {
      setError(`Base pattern length ${base?.length || 0} does not match neuron count ${neuronCount}`);
      return;
    }

    const noisy = createNoisyCopy(base, simulationNoiseLevel || 0);
    setAvec(noisy);
    setAtext(JSON.stringify(noisy));
    setGridCols(neuronCount);
    setError(null);
  };

  const handleIterationChange = (idx) => {
    if (!Array.isArray(AHist) || AHist.length === 0) return;

    const clamped = Math.min(Math.max(idx, 0), AHist.length - 1);
    setIter(clamped);

    // When browsing after the run, sync the visible activation
    if (!isSimulating && hasRun && AHist[clamped]) {
      const state = AHist[clamped];
      setAvec(state);
      if (inputMode === "text") {
        setAtext(JSON.stringify(state));
      }
    }
  };

  
  const stopSimulation = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsSimulating(false);
  };

  useEffect(() => () => stopSimulation(), []);

  useEffect(() => {
    if (neuronCount > 0 && Avec.length === 0) {
      const initialState = Array(neuronCount).fill(-1);
      setAvec(initialState);
      setAtext(JSON.stringify(initialState));
    }
  }, []); // runs only on first mount

  // default to the latest memory
  useEffect(() => {
    let parsed = [];
    try {
      parsed = Array.isArray(memories) ? memories : JSON.parse(memories || "[]");
    } catch {
      parsed = [];
    }
    if (parsed.length > 0) setSelectedMemoryIndex(parsed.length - 1);
    else setSelectedMemoryIndex(null);
  }, [memories]);

  const canSimulate =
    neuronCount > 0 && Avec.length === neuronCount && WHist?.length;

  // Map activation rule dropdown values to backend update types
  const getUpdateType = (rule) => {
    const mapping = {
      "Discrete": "standard",
      "Continuous": "continuous",
      "Discrete-EF": "ef",
      "Continuous-EF": "continuous_ef",
    };
    return mapping[rule] || "standard";
  };

  async function onStartSimulation() {
    if (!canSimulate) return;
    setError(null);
    setAHist([]);
    setEnergyHist([]);
    setIter(0);
    stopSimulation();
    setInitialA([...Avec]);
    setIsSimulating(true);
    setHasRun(false);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(`${API_URL}/simulate_stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          A: Avec,
          network_id: networkId,
          max_iters: 200,
          granular: granularMode,
          update_type: getUpdateType(activationRule),
        }),
        signal: controller.signal,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          let data;
          try {
            data = JSON.parse(payload);
          } catch {
            continue;
          }

          if (data.done) {
            setIsSimulating(false);
            setHasRun(true);
            return;
          }

          if (data.A) {
            setAHist((prev) => {
              if (
                prev.length > 0 &&
                JSON.stringify(prev[prev.length - 1]) === JSON.stringify(data.A)
              )
                return prev;
              const next = [...prev, data.A];
              setIter(next.length - 1);
              if (inputMode === "text") {
                setAtext(JSON.stringify(data.A));
                setAvec(data.A);
              }
              return next;
            });

            if (data.E !== undefined) {
              setEnergyHist((prev) => {
                if (prev.length > 0 && prev[prev.length - 1] === data.E)
                  return prev;
                return [...prev, data.E];
              });
            }
          }
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    }
  }

  const handleReset = () => {
    if (initialA) {
      setAvec(initialA);
      setAtext(JSON.stringify(initialA));
      setAHist([]);
      setEnergyHist([]);
      setIter(0);
      stopSimulation();
      setIsSimulating(false);
      setHasRun(false);
    }
  };

  // pick which weight matrix to show (step slider) and final for reports
  const hasWHist = Array.isArray(WHist) && WHist.length > 0;

  // keep wStep in range whenever WHist length changes
  useEffect(() => {
    if (!hasWHist) {
      if (wStep !== 0) setWStep(0);
      return;
    }
    if (wStep >= WHist.length) {
      setWStep(WHist.length - 1);
    }
  }, [hasWHist, WHist, wStep]);

  const currentW = hasWHist ? WHist[wStep] : null;
  const finalW = hasWHist ? WHist[WHist.length - 1] : null;

  let parsedMems = [];
  try {
    parsedMems = Array.isArray(memories)
      ? memories
      : JSON.parse(memories || "[]");
  } catch {
    parsedMems = [];
  }
    const confirmReportNameAndGenerate = () => {
      const finalExperimentName =
        reportExperimentInput.trim() || experimentName || "Untitled Experiment";

      const defaultFileBase =
        simulationMode === "capacity"
          ? "memory_capacity_report"
          : "memory_recall_report";

      const finalFileName =
        reportFileNameInput.trim().length > 0
          ? reportFileNameInput.trim()
          : defaultFileBase;

      const parsedMemories = getParsedMemories();

      setExperimentName(finalExperimentName);
      setShowReportModal(false);

      generateReportPdf({
        type: simulationMode,
        experimentName: finalExperimentName,
        activationRule,
        AHist,
        Avec,
        energyHist,
        noise: capacityNoiseLevel,
        trialsPerDataPoint: capacityIterations,
        capacityResults,
        finalW,
        weightsCanvas: weightsCanvasRef.current,
        parsedMemories: parsedMemories,
        learningRule: rule,
        learningRate: learningRate,
        scale: scale,
        fileName: finalFileName,
      });
    };

    return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#0f141a",
        color: "#eaf4ff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Link
        to="/learning"
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "#1a6fd6",
          color: "#eaf4ff",
          textDecoration: "none",
          fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          backdropFilter: "blur(8px)",
          zIndex: 10,
        }}
      >
        Back to Learning
      </Link>

      <button
        onClick={() =>
          setSimulationMode(
            simulationMode === "activation" ? "capacity" : "activation"
          )
        }
        style={{
          position: "absolute",
          top: 20,
          right: drawerOpen ? drawerWidth + 50 : 20,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "#1a6fd6",
          color: "#eaf4ff",
          textDecoration: "none",
          fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          backdropFilter: "blur(8px)",
          zIndex: 10,
        }}
      >
        {simulationMode === "activation"
          ? "Switch to Memory Capacity Test"
          : "Switch to Activation Simulation"}
      </button>

      <button
        onClick={() => setDrawerOpen((o) => !o)}
        style={{
          position: "absolute",
          top: 70,
          right: drawerOpen ? drawerWidth + 50 : 20,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "#1a6fd6",
          color: "#eaf4ff",
          fontWeight: 600,
          zIndex: 10,
        }}
      >
        {drawerOpen ? "Close Side Panel" : "Open Side Panel"}
      </button>

      {/* MAIN FLEX LAYOUT */}
      <div
        style={{
          display: "flex",
          paddingTop: 80,
          paddingLeft: 20,
          paddingRight: 20,
          boxSizing: "border-box",
          minHeight: "100vh",
        }}
      >
        {/* main content column */}
        <div
          style={{
            flex: 1,
            maxWidth: "1500px",
             minWidth: 500,             
            marginRight: drawerOpen ? 11 : 0,
            transition: "margin-right 0.25s ease",
          }}
        >
          {/* Experiment Name and Activation Rule Controls */}
          <div
            style={{
              background: "rgba(20,20,26,0.92)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: 20,
              display: "flex",
              gap: 20,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 200 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  marginBottom: 6,
                  fontWeight: 500,
                  color: "#eaf4ff",
                }}
              >
                Experiment Name
              </label>
              <input
                type="text"
                value={experimentName}
                onChange={(e) => setExperimentName(e.target.value)}
                placeholder="e.g., AryaExperiment1Dec2025"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(0,0,0,0.4)",
                  color: "#eaf4ff",
                  fontSize: 13,
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  marginBottom: 6,
                  fontWeight: 500,
                  color: "#eaf4ff",
                }}
              >
                Activation Rule
              </label>
              <select
                value={activationRule}
                onChange={(e) => setActivationRule(e.target.value)}
                disabled={isSimulating || hasRun}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(0,0,0,0.4)",
                  color: "#eaf4ff",
                  fontSize: 13,
                  cursor: isSimulating || hasRun ? "not-allowed" : "pointer",
                }}
              >
                <option value="Discrete" style={{ background: "#000", color: "#fff" }}>
                  Discrete
                </option>
                <option value="Continuous" style={{ background: "#000", color: "#fff" }}>
                  Continuous
                </option>
                <option value="Discrete-EF" style={{ background: "#000", color: "#fff" }}>
                  Discrete-EF
                </option>
                <option value="Continuous-EF" style={{ background: "#000", color: "#fff" }}>
                  Continuous-EF
                </option>
              </select>
            </div>
          </div>

          <div
            style={{
              display: simulationMode === "activation" ? "block" : "none",
            }}
          >
          <ActivationLayout
            inputMode={inputMode}
            setInputMode={setInputMode}
            isSimulating={isSimulating}
            hasRun={hasRun}
            capacityTestActive={capacityTestActive}
            canSimulate={canSimulate}
            onStartSimulation={onStartSimulation}
            handleReset={handleReset}
            neuronCount={neuronCount}
            Atext={Atext}
            setAtext={setAtext}
            handleTextChange={handleTextChange}
            Avec={Avec}
            setAvec={setAvec}
            AHist={AHist}
            iter={iter}
            energyHist={energyHist}
            granularMode={granularMode}
            setGranularMode={setGranularMode}
            AHistLength={AHist.length}
            onIterationChange={handleIterationChange}
          />

          </div>

          <div
            style={{
              display: simulationMode === "capacity" ? "block" : "none",
            }}
          >
            <CapacityLayout
              capacityNoiseLevel={capacityNoiseLevel}
              setCapacityNoiseLevel={setCapacityNoiseLevel}
              capacityIterations={capacityIterations}
              setCapacityIterations={setCapacityIterations}
              capacityTestActive={capacityTestActive}
              capacityResults={capacityResults}
              handleRunCapacityTest={handleRunCapacityTest}
              panel={panel}
            />
          </div>

          {error && (
            <div
              style={{
                background: "rgba(255,0,0,0.15)",
                border: "1px solid rgba(255,0,0,0.4)",
                padding: 10,
                borderRadius: 8,
                marginTop: 12,
                color: "#ff6b6b",
              }}
            >
              {error}
            </div>
            
          )}
          <div
            style={{
              width: "97%",
              marginTop: 30,
              marginBottom: 40,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => {
                setReportExperimentInput(experimentName || "");
                setReportFileNameInput(
                  simulationMode === "capacity"
                    ? "memory_capacity_report"
                    : "memory_recall_report"
                );
                setShowReportModal(true);
              }}
              style={{
                width: 320,
                padding: "12px 16px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "#1a6fd6",
                color: "#fff",
                fontWeight: 600,
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                cursor: "pointer",
              }}
            >
              Generate Report PDF
            </button>

          </div>
        </div>

        {/* resizer + drawer */}
        {drawerOpen && (
          <div
            style={{
              display: "flex",
              height: "100%",
            }}
          >
            {/* vertical resize handle */}
            <div
              onMouseDown={handleDrawerResizeStart}
              style={{
                width: 6,
                cursor: "col-resize",
                background: "rgba(255,255,255,0.08)",
                borderRadius: 3,
                alignSelf: "stretch",
                marginLeft: 12,
                marginRight: 6,
              }}
            />

            <RightDrawer
              drawerWidth={drawerWidth}
              simulationNoiseLevel={simulationNoiseLevel}
              setSimulationNoiseLevel={setSimulationNoiseLevel}
              setDrawerOpen={setDrawerOpen}
              showW={showW}
              setShowW={setShowW}
              showMemories={showMemories}
              setShowMemories={setShowMemories}
              selectedMemoryIndex={selectedMemoryIndex}
              setSelectedMemoryIndex={setSelectedMemoryIndex}
              parsedMems={parsedMems}
              //step-aware matrix + slider info. This is the new slider logic btw
              currentW={currentW}
              finalW={finalW}
              wStep={wStep}
              setWStep={setWStep}
              WHistLength={Array.isArray(WHist) ? WHist.length : 0}
              learningColorScheme={learningColorScheme}
              isSimulating={isSimulating}
              hasRun={hasRun}
              neuronCount={neuronCount}
              simulationMode={simulationMode}
              canSimulate={canSimulate}
              generateNoisyInput={generateNoisyInput}
              onWeightsCanvasReady={(canvas) => {
                weightsCanvasRef.current = canvas;
              }}
            />

          </div>
        )}
      </div>
        {showReportModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            <div
              style={{
                width: 420,
                maxWidth: "90%",
                background: "rgba(20,20,26,0.98)",
                borderRadius: 16,
                padding: 24,
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "0 18px 45px rgba(0,0,0,0.55)",
                color: "#eaf4ff",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                Name this experiment and file
              </div>

              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 14 }}>
                The experiment name appears in the PDF. The file name is used when saving.
              </div>

              <label style={{ fontSize: 12, opacity: 0.85 }}>
                Experiment Name
              </label>
              <input
                type="text"
                value={reportExperimentInput}
                onChange={(e) => setReportExperimentInput(e.target.value)}
                placeholder="e.g., Experiment -1"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(0,0,0,0.4)",
                  color: "#eaf4ff",
                  marginBottom: 14,
                }}
              />

              <label style={{ fontSize: 12, opacity: 0.85 }}>
                File Name (without or with .pdf)
              </label>
              <input
                type="text"
                value={reportFileNameInput}
                onChange={(e) => setReportFileNameInput(e.target.value)}
                placeholder={
                  simulationMode === "capacity"
                    ? "memory_capacity_report"
                    : "memory_recall_report"
                }
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(0,0,0,0.4)",
                  color: "#eaf4ff",
                  marginBottom: 18,
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  onClick={() => setShowReportModal(false)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "transparent",
                    color: "#eaf4ff",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReportNameAndGenerate}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "#1a6fd6",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        )}
        
        {finalW && (
          <div style={{ position: "absolute", left: -9999, top: -9999 }}>
            <WeightsCanvas
              matrix={finalW}
              size={400}
              cmapName={learningColorScheme || "blueWhiteRed"}
              onCanvasReady={(canvas) => {
                weightsCanvasRef.current = canvas;  
              }}
            />
          </div>
        )}

    </div>
  );
}

const panel = {
  background: "rgba(20,20,26,0.92)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 16,
  marginTop: 16,
};
const panelHeader = {
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
  gap: 6,
};