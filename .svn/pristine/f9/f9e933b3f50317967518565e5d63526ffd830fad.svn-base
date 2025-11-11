import React from "react";

export default function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1e1e1e",
          borderRadius: 12,
          padding: 20,
          maxHeight: "80vh",
          maxWidth: "90vw",
          overflow: "auto",
          overflowX: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <div style={{ marginTop: 12, textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "#1a6fd6",
              color: "white",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
