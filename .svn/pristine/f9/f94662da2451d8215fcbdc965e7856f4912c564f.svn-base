import React from "react";

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
          width: "min(400px, 90vw)",
          color: "#fff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            style={{
              fontWeight: 700,
              fontSize: 18,
              marginBottom: 12,
              textAlign: "left",
            }}
          >
            {title}
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}
