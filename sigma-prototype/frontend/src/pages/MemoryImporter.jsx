import React, { useState, useMemo } from "react";
import ImportPreviewTable from "./ImportPreviewTable";
import Modal from "./Modal";

export default function MemoryImporter({ expectedN, onImportMemories }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("replace");
  const [filename, setFilename] = useState("");
  const [parsed, setParsed] = useState([]);
  const [error, setError] = useState("");
  const [delimiter, setDelimiter] = useState(",");
  const [previewOpen, setPreviewOpen] = useState(false);

  const neuronCount = useMemo(() => {
    if (expectedN && Number.isInteger(expectedN)) return expectedN;
    const first = parsed?.[0];
    return Array.isArray(first) ? first.length : 0;
  }, [expectedN, parsed]);

  const memCount = parsed?.length || 0;

  function detectDelimiterFrom(line) {
    if (line.includes("\t")) return "\t";
    if (line.includes(",")) return ",";
    return /\s+/;
  }

  function parseTextToRows(text) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  }

  function tokenize(line, delim) {
    if (delim instanceof RegExp) {
      return line.split(delim).map((t) => t.trim()).filter((t) => t.length > 0);
    }
    return line.split(delim).map((t) => t.trim());
  }

  function rowsToMatrix(rows, delim) {
    const out = [];
    for (const row of rows) {
      if (out.length === 0) {
        const maybeHeader = tokenize(row, delim);
        const hasNonNumeric = maybeHeader.some((t) => isNaN(Number(t)));
        if (hasNonNumeric) continue;
      }
      const tokens = tokenize(row, delim);
      if (tokens.length === 0) continue;
      const nums = tokens.map((t) => Number(t));
      if (nums.some((n) => Number.isNaN(n))) {
        throw new Error(
          `Invalid numeric token on line ${out.length + 1} ("${row}")`
        );
      }
      out.push(nums);
    }
    return out;
  }

  function validateSameWidth(matrix) {
    if (!Array.isArray(matrix) || matrix.length === 0) {
      throw new Error("No memories found in file.");
    }
    const w = matrix[0].length;
    for (let i = 1; i < matrix.length; i++) {
      if (matrix[i].length !== w) {
        throw new Error(
          `Row ${i + 1} has ${matrix[i].length} columns, expected ${w}.`
        );
      }
    }
  }

  function validateWidthEquals(matrix, N) {
    if (!N) return;
    const w = matrix[0].length;
    if (w !== N) {
      throw new Error(`CSV has ${w} neurons per memory, but expected ${N}.`);
    }
  }

  function validateAllowedValues(matrix) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        const v = matrix[r][c];
        if (v !== -1 && v !== 1) {
          throw new Error(
            `Row ${r + 1}, col ${c + 1} contains "${v}". Allowed values are only -1 or 1.`
          );
        }
      }
    }
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
        const text = String(reader.result || "");
        const rows = parseTextToRows(text);
        if (rows.length === 0) throw new Error("No non-empty rows found.");

        const delim = detectDelimiterFrom(rows.find((l) => l.length > 0) || "");
        setDelimiter(typeof delim === "string" ? delim : "whitespace");

        const matrix = rowsToMatrix(rows, delim);

        validateSameWidth(matrix);
        validateAllowedValues(matrix);
        if (expectedN) validateWidthEquals(matrix, expectedN);

        setParsed(matrix);
      } catch (err) {
        setError(err.message || "Unable to parse CSV.");
        setParsed([]);
      }
    };
    reader.readAsText(file);
  }

  function applyImport() {
    if (!parsed?.length) {
      setError("Nothing to import yet. Please choose a valid CSV file.");
      return;
    }
    setError("");
    onImportMemories(parsed, mode === "append" ? "append" : "replace");
  }

  return (
    <div style={{ marginTop: 8, width: "100%" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          color: "#eaf4ff",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>{open ? "▾" : "▸"}</span>
          Import Memories (CSV)
        </span>
        <span style={{ opacity: 0.85, fontWeight: 500, fontSize: 12 }}>
          {memCount} {memCount === 1 ? "memory" : "memories"} •{" "}
          {neuronCount || "?"} neurons
          {filename ? ` • ${filename}` : ""}
        </span>
      </button>

      <div
        style={{
          maxHeight: open ? 1400 : 0,
          overflow: "hidden",
          transition: "max-height 220ms ease, opacity 180ms ease",
          opacity: open ? 1 : 0,
        }}
        aria-hidden={!open}
      >
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.06)",
                  color: "#eaf4ff",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  <li>Comma-separated values</li>
                  <li>Each entry must be -1 or 1</li>
                  <li>Each row = one memory (length = # of neurons)</li>
                  <li>
                    Ex. CSV containing 2 memories, 5 neurons:
                    <div style={{ marginLeft: 12 }}>
                      <code>1,-1,1,-1,1</code>
                    </div>
                    <div style={{ marginLeft: 12 }}>
                      <code>-1,1,-1,1,-1</code>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div style={{ marginLeft: 20 }}>
              <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>
                Import options:
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={mode === "replace"}
                    onChange={() => setMode("replace")}
                  />
                  Replace
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={mode === "append"}
                    onChange={() => setMode("append")}
                  />
                  Append
                </label>
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(255,0,0,0.08)",
                border: "1px solid rgba(255,0,0,0.25)",
                color: "#ffb4b4",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {parsed.length > 0 && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                {/* Left side: Open Preview */}
                <button
                  onClick={() => setPreviewOpen(true)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "#1a6fd6",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Open Preview
                </button>

                {/* Right side: Apply Import */}
                <button
                  onClick={applyImport}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "#1a6fd6",
                    color: "#eaf4ff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Apply Import
                </button>
              </div>

              <Modal open={previewOpen} onClose={() => setPreviewOpen(false)}>
                <h3>
                  CSV Preview ({parsed.length} memories, {parsed[0]?.length ?? 0} neurons)
                </h3>
                <ImportPreviewTable data={parsed} />
              </Modal>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
