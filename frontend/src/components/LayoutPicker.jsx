import React, {
  useMemo,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { computeLayoutOptions, buildMask } from "../components/layoutOptions";

const CELL = 40;
const GAP = 2;

// Decide how each grid cell should look based on whether it's padding or an active neuron.
function cellColors({ isPad, on }) {
  if (isPad) {
    // "Padding" cells used to visually fill out the layout, not real neurons.
    return {
      bg: "rgba(120,120,120,0.25)",
      fg: "rgba(255,255,255,0.5)",
      border: "1px solid rgba(255,255,255,0.18)",
      cursor: "default",
      textShadow: "0 1px 1px rgba(0,0,0,0.35)",
    };
  }
  if (on) {
    // Active neuron (+1)
    return {
      bg: "rgba(26,111,214,0.78)",        
      fg: "#ffffff",                       
      border: "1px solid rgba(255,255,255,0.45)",
      cursor: "pointer",
      textShadow: "0 1px 2px rgba(0,0,0,0.45)", 
    };
  }
  // Inactive neuron (-1)
  return {
    bg: "rgba(255,255,255,0.07)",          
    fg: "rgba(235,240,245,0.8)",           
    border: "1px solid rgba(255,255,255,0.22)",
    cursor: "pointer",
    textShadow: "0 1px 1px rgba(0,0,0,0.35)",
  };
}

// LayoutPicker lets the user choose a neuron layout and build a set of memories
// by clicking on a grid of +1 / -1 neurons.
export default function LayoutPicker({
  neuronCount,          // total number of real neurons
  value,                // currently selected layout (from parent)
  onLayoutChange,       // callback when layout is changed
  approxContainerWidth, // hint for computing a good layout
  initialMemories = [], // memories coming in from upstream (e.g., CSV import)
  onMemoriesChange,     // callback when the memory list changes
}) {
  // Compute all possible layouts for this neuron count.
  const options = useMemo(
    () => computeLayoutOptions(neuronCount, { approxContainerWidth }),
    [neuronCount, approxContainerWidth]
  );

  // Try to preserve the selected layout if possible, otherwise fall back to the first.
  const selected =
    (value && options.find((o) => o.key === value.key)) || options[0] || null;

  // currentMem: the memory currently being edited on the main grid.
  const [currentMem, setCurrentMem] = useState([]);
  // memList: all saved memories in this session.
  const [memList, setMemList] = useState([]);
  // selectedMemIdx: which saved memory is currently "active" in the gallery.
  const [selectedMemIdx, setSelectedMemIdx] = useState(-1);
  // showConfirmClear: whether the "Clear All memories" modal is visible.
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  
  // Whenever neuronCount changes (or we get new initialMemories),
  // normalize and reset our local memory state.
  useEffect(() => {
    if (neuronCount <= 0) {
      // Nothing to do if there are no neurons.
      setCurrentMem([]);
      setMemList([]);
      setSelectedMemIdx(-1);
      return;
    }

    // Sanitize initialMemories:
    //  - only arrays with the right length
    //  - map any non-1 values to -1
    const cleaned = (Array.isArray(initialMemories) ? initialMemories : [])
      .filter((m) => Array.isArray(m) && m.length === neuronCount)
      .map((m) => m.map((v) => (v === 1 ? 1 : -1)));

    if (cleaned.length) {
      // If we got valid memories, load them and select the first one.
      setMemList(cleaned);
      setSelectedMemIdx(0);
      setCurrentMem(cleaned[0].slice());
    } else {
      // Otherwise start with a blank pattern (all -1).
      const blank = Array(neuronCount).fill(-1);
      setMemList([]);
      setSelectedMemIdx(-1);
      setCurrentMem(blank);
    }
  }, [neuronCount, initialMemories]);

  // mask marks which grid cells correspond to real neurons vs padding cells.
  const mask = useMemo(() => {
    if (!selected) return [];
    return buildMask(neuronCount, selected.base);
  }, [neuronCount, selected]);

  // Toggle a single cell (+1 <-> -1), respecting the mask and neuronCount.
  const handleCellToggle = useCallback(
    (cellIndex) => {
      if (!selected || !mask[cellIndex] || cellIndex >= neuronCount) return;
      setCurrentMem((prev) => {
        const next = prev.slice();
        next[cellIndex] = next[cellIndex] === 1 ? -1 : 1;
        return next;
      });
    },
    [mask, neuronCount, selected]
  );

  // --- Global drag management ---
  // We allow click-and-drag painting across cells, so we track drag state globally.
  const isMouseDown = useRef(false);
  const toggled = useRef(new Set());

  // When dragging, if we hover over a cell we haven't toggled yet during this drag,
  // flip it once and remember it so we don't keep flipping back and forth.
  const handleGlobalMove = useCallback(
    (e) => {
      if (!isMouseDown.current) return;
      const target = e.target;
      const idxAttr = target.getAttribute("data-idx");
      if (idxAttr == null) return;
      const idx = parseInt(idxAttr, 10);
      if (Number.isNaN(idx)) return;
      if (!toggled.current.has(idx)) {
        handleCellToggle(idx);
        toggled.current.add(idx);
      }
    },
    [handleCellToggle]
  );

  // Clean up drag state and detach listeners when the user releases the mouse.
  const stopDrag = useCallback(() => {
    isMouseDown.current = false;
    toggled.current.clear();
    document.removeEventListener("mousemove", handleGlobalMove);
    document.removeEventListener("mouseup", stopDrag);
  }, [handleGlobalMove]);

  // Start drag on the initial mouse down.
  const startDrag = (idx) => {
    isMouseDown.current = true;
    toggled.current.clear();
    handleCellToggle(idx);
    toggled.current.add(idx);
    document.addEventListener("mousemove", handleGlobalMove);
    document.addEventListener("mouseup", stopDrag);
  };

  // Compute a reasonable cell size given the layout’s column count,
  // so the grid doesn’t blow past the fixed maxWidth.
  const maxCellSize = 40;
  const maxWidth = 600;
  const size = Math.min(maxCellSize, Math.floor(maxWidth / (selected?.cols || 1)));

  // Save the current pattern into the memory list and notify the parent.
  const addCurrentAsMemory = () => {
    if (currentMem.length !== neuronCount) return;
    setMemList((prev) => {
      const next = [...prev, currentMem.slice()];
      setSelectedMemIdx(next.length - 1);
      onMemoriesChange?.(next, "add", currentMem.slice());
      return next;
    });
  };

  // Reset the current pattern back to all -1.
  const clearCurrent = () => setCurrentMem(Array(neuronCount).fill(-1));

  // Load a memory from the gallery into the main editor.
  const selectMemory = (idx) => {
    setSelectedMemIdx(idx);
    const m = memList[idx];
    if (m) setCurrentMem(m.slice());
  };

  // Remove a specific memory and keep the state consistent (selection + editor).
  const deleteMemory = (idx) => {
    setMemList((list) => {
      const next = list.slice(0, idx).concat(list.slice(idx + 1));
      if (selectedMemIdx === idx) {
        // If we deleted the active one, try to pick a reasonable fallback.
        if (next.length) {
          setSelectedMemIdx(0);
          setCurrentMem(next[0].slice());
        } else {
          setSelectedMemIdx(-1);
          setCurrentMem(Array(neuronCount).fill(-1));
        }
      }
      onMemoriesChange?.(next, "delete", idx);
      return next;
    });
  };

  // Duplicate an existing memory so the user can tweak it without losing the original.
  const cloneMemory = (idx) => {
    setMemList((list) => {
      const src = list[idx];
      if (!src) return list;
      const cloned = src.slice();
      const next = [...list, cloned];
      const newIdx = next.length - 1;
      setSelectedMemIdx(newIdx);
      setCurrentMem(cloned.slice());
      onMemoriesChange?.(next, "clone", { from: idx, value: cloned.slice() });

      return next;
    });
  };

  // When the layout dropdown changes, find the corresponding option and notify parent.
  const handleLayoutChange = (e) => {
    const next = options.find((o) => o.key === e.target.value) || null;
    onLayoutChange?.(next);
  };

  if (!selected) {
    return (
      <div style={{ color: "orange", fontSize: 14 }}>
        No valid layout available for N = {neuronCount}.
        Try using fewer neurons or importing memories numerically.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>
        Neuron Layout (view):
      </div>
      <select
        value={selected?.key || ""}
        onChange={handleLayoutChange}
        style={{
          width: "100%",
          padding: 8,
          borderRadius: 10,
          background: "rgba(255,255,255,0.06)",
          color: "#eaf4ff",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {options.map((opt) => (
          <option key={opt.key} value={opt.key} style={{ color: "black" }}>
            {opt.label}
          </option>
        ))}
      </select>

      {selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 2 }}>
            Build / Edit Memory
          </div>

          {/* Main editable memory grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${selected.cols}, ${size}px)`,
              gap: GAP,
              alignSelf: "start",
              userSelect: "none",
            }}
          >
            {Array.from({ length: selected.base }).map((_, idx) => {
              const isReal = mask[idx];
              const on = isReal ? currentMem[idx] === 1 : false;
              const { bg, fg, border, cursor, textShadow } = cellColors({ isPad: !isReal, on });
              const label = !isReal ? "—" : on ? "1" : "−1"; // NOTE: Unicode minus for the off state

              return (
                <div
                  key={idx}
                  data-idx={idx}
                  onMouseDown={() => startDrag(idx)}
                  className="mono"
                  style={{
                    width: size,
                    height: size,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: bg,
                    color: fg,
                    border,
                    cursor,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, "Ubuntu Mono", Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: Math.max(12, Math.floor(size * 0.42)),
                    fontWeight: 700,
                    letterSpacing: 0.2,
                    lineHeight: 1,
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                    textShadow,
                    userSelect: "none",
                    transition:
                      "background 120ms ease, outline 80ms ease, transform 80ms ease",
                  }}
                  title={!isReal ? "Padding" : on ? "+1" : "−1"}
                  onMouseEnter={(e) => {
                    if (isReal)
                      e.currentTarget.style.outline =
                        "2px solid rgba(255,255,255,0.28)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.outline = "none";
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={addCurrentAsMemory} style={btnPrimary}>
              Add as memory
            </button>
            <button onClick={clearCurrent} style={btnGhost}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Memory gallery */}
      {selected && memList.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              Memories ({memList.length})
            </div>
            <button
              onClick={() => setShowConfirmClear(true)}
              style={{ ...btnPrimary, background: "#b33a3a" }}
              title="Remove all saved memories"
            >
              Clear All
            </button>
          </div>

          {/* Thumbnail view of each saved memory */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {memList.map((mem, idx) => {
              const isSel = idx === selectedMemIdx;
              return (
                <div
                  key={idx}
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    border: isSel
                      ? "2px solid #1a6fd6"
                      : "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    boxShadow: isSel
                      ? "0 0 0 4px rgba(26,111,214,0.15)"
                      : "none",
                  }}
                >
                  {/* Thumbnail grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${selected.cols}, ${Math.floor(
                        CELL * 0.6
                      )}px)`,
                      gap: GAP,
                      alignSelf: "start",
                    }}
                    onClick={() => selectMemory(idx)}
                    title="Select to edit"
                  >
                    {Array.from({ length: selected.base }).map((_, j) => {
                      const isReal = mask[j];
                      const on = isReal ? mem[j] === 1 : false;
                      const { bg, fg, border } = cellColors({ isPad: !isReal, on });
                      return (
                        <div
                          key={j}
                          className="mono"
                          style={{
                            width: Math.floor(CELL * 0.6),
                            height: Math.floor(CELL * 0.6),
                            borderRadius: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: bg,
                            color: fg,
                            border,
                            fontSize: 10,
                            userSelect: "none",
                          }}
                        >
                          {!isReal ? "—" : on ? "1" : "-1"}
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "space-between",
                      marginTop: 4,
                    }}
                  >
                    <button
                      onClick={() => selectMemory(idx)}
                      style={btnPrimary}
                    >
                      Select
                    </button>
                    <button
                      onClick={() => cloneMemory(idx)}
                      style={btnClone}
                      onMouseOver={(e) =>
                        (e.target.style.backgroundColor = "#169b6e")
                      }
                      onMouseOut={(e) =>
                        (e.target.style.backgroundColor = "#1ab37e")
                      }
                    >
                      Clone
                    </button>
                    <button
                      onClick={() => deleteMemory(idx)}
                      style={{ ...btnPrimary, background: "#b33a3a" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full "Clear All" confirmation overlay */}
      {showConfirmClear && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "rgba(30, 30, 30, 0.95)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 10,
              padding: 24,
              width: 320,
              color: "#eaf4ff",
              textAlign: "center",
              boxShadow: "0 0 25px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ fontSize: 14, marginBottom: 16 }}>
              Are you sure you want to clear all memories?
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                onClick={() => {
                  // Clear everything and inform the parent.
                  const blank = Array(neuronCount).fill(-1);
                  setMemList([]);
                  setSelectedMemIdx(-1);
                  setCurrentMem(blank);
                  onMemoriesChange?.([], "clear_all");
                  setShowConfirmClear(false);
                }}
                style={{ ...btnPrimary, background: "#b33a3a" }}
              >
                Yes, clear all
              </button>
              <button
                onClick={() => setShowConfirmClear(false)}
                style={btnGhost}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Basic button style variants used across the component.
const btnPrimary = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#1a6fd6",
  color: "#eaf4ff",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

const btnGhost = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.08)",
  color: "#eaf4ff",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

const btnClone = {
  ...btnPrimary,
  background: "#1ab37e", 
  border: "1px solid rgba(255,255,255,0.15)",
};
