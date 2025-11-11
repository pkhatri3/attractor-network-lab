// src/components/ToolsMenu.jsx
import React from "react";
import {
  serializeGraph,
  downloadText,
  toAdjacencyCSV,
  parseAdjacencyCSV,
  loadNetworkIntoGraph,
} from "../utils/ioUtils";

export default function ToolsMenu({
  open,
  mode,
  setMode,
  template,
  setTemplate,
  hopfieldCount,
  setHopfieldCount,
  rectRows,
  setRectRows,
  rectCols,
  setRectCols,
  hexRows,
  setHexRows,
  hexCols,
  setHexCols,
  onClearAll,
  graphRef,
  sigmaRef,
  setNetwork,
}) {
  if (!open) return null;

  const handleExportJSON = () => {
    const net = serializeGraph(graphRef.current);
    downloadText("network.json", JSON.stringify(net, null, 2));
  };

  const handleExportCSV = () => {
    const net = serializeGraph(graphRef.current);
    const csv = toAdjacencyCSV(net, { includeLayout: true });
    downloadText("network.csv", csv);
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      let network;
      if (file.name.toLowerCase().endsWith(".json")) {
        network = JSON.parse(text);
        if (!network || typeof network.N !== "number" || !Array.isArray(network.C)) {
          throw new Error("Invalid JSON network format");
        }
        if (!Array.isArray(network.layout)) network.layout = [];
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        network = parseAdjacencyCSV(text);
      } else {
        throw new Error("Unsupported file type. Use .json or .csv");
      }

      loadNetworkIntoGraph(graphRef.current, network, 5);
      sigmaRef.current?.refresh();
      setNetwork?.(network);
    } catch (err) {
      alert("Import failed: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 64,
        left: 12,
        zIndex: 19,
        width: 300,
        padding: 12,
        borderRadius: 16,
        background: "rgba(20,20,26,0.92)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#eaf4ff",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Graph Tools</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* --- Add / Delete Mode --- */}
        <button
          onClick={() => setMode(mode === "add" ? "idle" : "add")}
          aria-pressed={mode === "add"}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              mode === "add" ? "#1a6fd6" : "rgba(255,255,255,0.06)",
            color: "#eaf4ff",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          Add Node (A)
        </button>

        <button
          onClick={() => setMode(mode === "delete" ? "idle" : "delete")}
          aria-pressed={mode === "delete"}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              mode === "delete" ? "#1a6fd6" : "rgba(255,255,255,0.06)",
            color: "#eaf4ff",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          Delete (D)
        </button>

        {/* --- Template Dropdown --- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 550, opacity: 0.8 }}>Template</div>
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
            <option value="hopfield" style={{ color: "#000" }}>
              Hopfield
            </option>
            <option value="rect" style={{ color: "#000" }}>
              Rectangular Connectivity
            </option>
            <option value="hex" style={{ color: "#000" }}>
              Hexagonal Connectivity
            </option>
          </select>

          {/* --- Template-specific controls --- */}
          {template === "hopfield" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, opacity: 0.8, whiteSpace: "nowrap" }}>
                Nodes
              </span>
              <input
                type="number"
                min={2}
                value={hopfieldCount}
                onFocus={(e) => e.target.select()}
                onClick={(e) => e.currentTarget.select()}
                onChange={(e) =>
                  setHopfieldCount(e.target.value.replace(/[^0-9]/g, ""))
                }
                style={{ width: 100, padding: "8px 10px", borderRadius: 10 }}
              />
            </div>
          )}

          {template === "rect" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Rows</span>
                <input
                  type="number"
                  min={1}
                  value={rectRows}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    setRectRows(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 10,
                  }}
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
                  onChange={(e) =>
                    setRectCols(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 10,
                  }}
                />
              </div>
            </div>
          )}

          {template === "hex" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Rows</span>
                <input
                  type="number"
                  min={1}
                  value={hexRows}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    setHexRows(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 10,
                  }}
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
                  onChange={(e) =>
                    setHexCols(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 10,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* --- Clear All --- */}
        <button
          onClick={onClearAll}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "#eaf4ff",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          Clear All (C)
        </button>

        {/* --- Import / Export --- */}
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.12)",
            margin: "8px 0",
          }}
        />

        <div style={{ fontWeight: 550, opacity: 0.8 }}>Export / Import</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            onClick={handleExportJSON}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#eaf4ff",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            Export JSON
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#eaf4ff",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            Export CSV
          </button>
        </div>

        <label
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "#eaf4ff",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Import (.json / .csv)
          <input
            type="file"
            accept=".json,.csv"
            onChange={(e) => handleImportFile(e.target.files?.[0])}
            style={{ display: "none" }}
          />
        </label>
      </div>
    </div>
  );
}
