import React, {
  useMemo,
  useEffect,
  useState,
  useCallback,
  useContext,
  useRef,
} from "react";
import { computeLayoutOptions, buildMask } from "./layoutOptions";
import { SimulationContext } from "../SimulationContext";
import StateImporter from "./StateImporter";

const GAP = 2;

function cellColors({ isPad, on }) {
  if (isPad)
    return {
      bg: "rgba(128,128,128,0.25)",
      fg: "rgba(255,255,255,0.35)",
      border: "1px solid rgba(255,255,255,0.12)",
      cursor: "default",
    };
  if (on)
    return {
      bg: "rgba(26,111,214,0.78)",
      fg: "#eaf4ff",
      border: "1px solid rgba(255,255,255,0.20)",
      cursor: "pointer",
    };
  return {
    bg: "rgba(255,255,255,0.06)",
    fg: "#b9c6d2",
    border: "1px solid rgba(255,255,255,0.12)",
    cursor: "pointer",
  };
}

export default function StatePicker({
  neuronCount,
  approxContainerWidth,
  initialState = [],
  externalState,
  disabled = false,
  onStateChange,
  iteration = null,
}) {
  const options = useMemo(
    () => computeLayoutOptions(neuronCount, { approxContainerWidth }),
    [neuronCount, approxContainerWidth]
  );

  const { layoutChoice, setLayoutChoice } = useContext(SimulationContext);
  const selected = layoutChoice || options[0];
  const [currentState, setCurrentState] = useState([]);

  useEffect(() => {
    if (externalState?.length === neuronCount) {
      setCurrentState(externalState);
      return;
    }
    if (neuronCount <= 0) {
      setCurrentState([]);
      return;
    }
    const cleaned =
      Array.isArray(initialState) && initialState.length === neuronCount
        ? initialState.map((v) => (v === 1 ? 1 : -1))
        : Array(neuronCount).fill(-1);
    setCurrentState(cleaned);
  }, [neuronCount, initialState, externalState]);

  const mask = useMemo(() => {
    if (!selected) return [];
    return buildMask(neuronCount, selected.base);
  }, [neuronCount, selected]);

  const handleCellToggle = useCallback(
    (cellIndex) => {
      if (disabled || !mask[cellIndex] || cellIndex >= neuronCount) return;
      setCurrentState((prev) => {
        const next = [...prev];
        next[cellIndex] = next[cellIndex] === 1 ? -1 : 1;
        setTimeout(() => {
                onStateChange?.(next, selected);
              }, 0);
        return next;
      });
    },
    [disabled, mask, neuronCount, onStateChange, selected]
  );

  const handleLayoutChange = (e) => {
    if (disabled) return;
    const next = options.find((o) => o.key === e.target.value) || null;
    setLayoutChoice(next);
    setTimeout(() => {
      if (next) onStateChange?.(currentState, next);
    }, 0);
  };

  const isMouseDown = useRef(false);
  const toggled = useRef(new Set());

  const handleGlobalMove = useCallback(
    (e) => {
      if (!isMouseDown.current || disabled) return;
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
    [disabled, handleCellToggle]
  );

  const stopDrag = useCallback(() => {
    isMouseDown.current = false;
    toggled.current.clear();
    document.removeEventListener("mousemove", handleGlobalMove);
    document.removeEventListener("mouseup", stopDrag);
  }, [handleGlobalMove]);

  const startDrag = (idx) => {
    if (disabled) return;
    isMouseDown.current = true;
    toggled.current.clear();
    handleCellToggle(idx);
    toggled.current.add(idx);
    document.addEventListener("mousemove", handleGlobalMove);
    document.addEventListener("mouseup", stopDrag);
  };

  const handleClear = () => {
    if (disabled) return;
    const cleared = Array(neuronCount).fill(-1);
    setCurrentState(cleared);
    setTimeout(() => {
      onStateChange?.(cleared, selected);
    }, 0);
  };

  const maxCellSize = 40;
  const maxWidth = 600;
  const size = selected
    ? Math.min(maxCellSize, Math.floor(maxWidth / selected.cols))
    : maxCellSize;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>
        Neuron Layout (view):
      </div>

      <select
        value={selected?.key || ""}
        onChange={handleLayoutChange}
        disabled={disabled}
        style={{
          width: "100%",
          padding: 8,
          borderRadius: 10,
          background: "rgba(255,255,255,0.06)",
          color: "#eaf4ff",
          border: "1px solid rgba(255,255,255,0.12)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
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

          <StateImporter
            expectedN={neuronCount}
            disabled={disabled}
            onImportState={(row) => {
              setTimeout(() => {
                onStateChange?.(row, selected);
              }, 0);
              
              setCurrentState(row);
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${selected.cols}, ${size}px)`,
              gap: GAP,
              alignSelf: "start",
              userSelect: "none",
              opacity: disabled ? 0.85 : 1,
            }}
          >
            {Array.from({ length: selected.base }).map((_, idx) => {
              const isReal = mask[idx];
              const on = isReal ? currentState[idx] === 1 : false;
              const { bg, fg, border, cursor } = cellColors({ isPad: !isReal, on });

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
                    fontSize: 12,
                    cursor: disabled ? "not-allowed" : cursor,
                  }}
                  title={!isReal ? "Padding" : on ? "+1" : "-1"}
                >
                  {!isReal ? "—" : on ? "1" : "-1"}
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 8,
              width: "100%",
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <button
              onClick={handleClear}
              disabled={disabled}
              style={{
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
              Clear
            </button>

            {iteration !== null && (
              <div
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: 13,
                  color: "#aaa",
                  fontWeight: 500,
                }}
              >
                Iteration {iteration}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
