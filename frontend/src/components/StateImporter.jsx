import React, { useState } from "react";

export default function StateImporter({ expectedN, onImportState, disabled }) {
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState([]);

  function detectDelimiter(line) {
    if (line.includes("\t")) return "\t";
    if (line.includes(",")) return ",";
    return /\s+/;
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setError("");
    setParsed([]);

    const reader = new FileReader();
    reader.onerror = () => setError("Failed to read file.");
    reader.onload = () => {
      try {
        const text = String(reader.result || "").trim();
        if (!text) throw new Error("File is empty.");

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length === 0) throw new Error("No valid lines found.");
        if (lines.length > 1)
          throw new Error(
            `File contains ${lines.length} lines. Only one row is allowed.`
          );

        const line = lines[0];
        const delim = detectDelimiter(line);
        const tokens = line.split(delim).map((t) => t.trim());
        const nums = tokens.map((t) => Number(t));

        if (nums.some((n) => Number.isNaN(n))) {
          throw new Error("File contains non-numeric values.");
        }
        if (nums.some((n) => n !== -1 && n !== 1)) {
          throw new Error("Values must be -1 or 1 only.");
        }
        if (expectedN && nums.length !== expectedN) {
          throw new Error(
            `Row has ${nums.length} values, expected ${expectedN}.`
          );
        }

        setParsed(nums);
      } catch (err) {
        setError(err.message || "Unable to parse CSV.");
      }
    };
    reader.readAsText(file);
  }

  function applyImport() {
    if (!parsed.length) {
      setError("Nothing to import yet. Choose a valid CSV first.");
      return;
    }
    setError("");
    onImportState(parsed);
    setOpen(false);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        width: "100%",
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.08)",
          color: "#eaf4ff",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>{open ? "▼" : "▶"}</span>
          Import CSV
        </span>
        {filename && (
          <span
            style={{
              opacity: 0.75,
              fontSize: 11,
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
              maxWidth: 120,
            }}
          >
            {filename}
          </span>
        )}
      </button>

      {/* Collapsible Panel */}
      <div
        style={{
          maxHeight: open ? 300 : 0,
          overflow: "hidden",
          transition: "max-height 200ms ease, opacity 180ms ease",
          opacity: open ? 1 : 0,
          width: "100%",
        }}
      >
        <div
          style={{
            marginTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: 10,
          }}
        >
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            style={{
              width: "fit-content",
              padding: 6,
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              color: "#eaf4ff",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 12,
            }}
          />

          <div style={{ fontSize: 11, opacity: 0.75, lineHeight: 1.4, marginLeft: "10px" }}>
            <li>Comma-separated values</li>
                  <li>Each entry must be -1 or 1</li>
                  <li>One row (length = # of neurons)</li>
                  <li>
                    Example:
                    <div style={{ marginLeft: 12 }}>
                      <code>1,-1,1,-1,1</code>
                    </div>
                  </li>
          </div>

          {error && (
            <div
              style={{
                padding: "6px 8px",
                borderRadius: 6,
                background: "rgba(255,0,0,0.08)",
                border: "1px solid rgba(255,0,0,0.2)",
                color: "#ffb4b4",
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          {parsed.length > 0 && (
            <button
              onClick={applyImport}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#1a6fd6",
                color: "#eaf4ff",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Apply Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
