import React from "react";


export default function ImportPreviewTable({ data, maxRows = 8 }) {
  if (!Array.isArray(data) || data.length === 0) return null;

  const rows = data.slice(0, maxRows);
  const cols = rows[0]?.length || 0;

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: "6px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
                whiteSpace: "nowrap",
                opacity: 0.85,
              }}
            >
              Row
            </th>
            {Array.from({ length: cols }).map((_, i) => (
              <th
                key={i}
                style={{
                  textAlign: "center",
                  padding: "6px 8px",
                  borderBottom: "1px solid rgba(255,255,255,0.12)",
                  whiteSpace: "nowrap",
                  opacity: 0.85,
                }}
              >
                n{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              <td
                style={{
                  padding: "6px 8px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {ri + 1}
              </td>
              {r.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    textAlign: "center",
                    padding: "6px 8px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {data.length > maxRows && (
            <tr>
              <td
                colSpan={cols + 1}
                style={{
                  padding: "6px 8px",
                  color: "rgba(255,255,255,0.6)",
                  fontStyle: "italic",
                }}
              >
                …and {data.length - maxRows} more rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
