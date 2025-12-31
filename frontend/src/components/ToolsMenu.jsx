// Start by importing necessary libraries and components
import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import "../styles/ToolsMenu.css";

// Utility functions for graph serialization and file handling
import {
  serializeGraph,
  downloadText,
  toAdjacencyCSV,
  parseAdjacencyCSV,
  loadNetworkIntoGraph,
} from "../utils/ioUtils"; // Import these functions from your utility file

// Define the ToolsMenu component
export default function ToolsMenu({ 
  open,
  mode, 
  setMode,
  connectionProb,
  setConnectionProb,
  ensureConnected,
  setEnsureConnected,
  hopfieldCount,
  setHopfieldCount,
  rectRows,
  setRectRows,
  rectCols,
  setRectCols,
  triRows,
  setTriRows,
  triCols,
  setTriCols,
  triRadius,
  setTriRadius,
  onClearAll,
  graphRefs,
  objectType,
  setObjectType,
  selectedTemplate,
  setSelectedTemplate,
  customTemplates,
  setCustomTemplates,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false); // For clear all confirmation
  const [saveOpen, setSaveOpen] = useState(false); // For save template modal
  const [saveName, setSaveName] = useState(""); // Template name input
  const [saveFormat, setSaveFormat] = useState("json"); // Template format selection

  // Ensure a default template is selected when in add mode and objectType is template (The hopfield template highlighted by default)
  useEffect(() => {
    if (mode === "add" && objectType === "template" && !selectedTemplate) {
      setSelectedTemplate("Hopfield Connectivity");
    }
  }, [mode, objectType, selectedTemplate, setSelectedTemplate]); 

  // Helper to get current graph and sigma instances
  const getInstances = () => {
    const wrapper = graphRefs?.current; // { graphRef, sigmaRef }
    const graph = wrapper?.graphRef?.current || null; // get graph instance
    const sigma = wrapper?.sigmaRef?.current || null; // get sigma instance
    return { graph, sigma }; 
  };

  // Handle importing a template file
  const handleImportFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text(); // Read file content as text
      let network; 
      if (file.name.toLowerCase().endsWith(".json")) { // Handle the imports based on file type this one is for json
        network = JSON.parse(text); // Parse JSON content
        if (!network || typeof network !== "object") throw new Error("Invalid JSON"); // Basic validation 
        if (!Array.isArray(network.layout)) network.layout = []; // Ensure layout array exists to know where to place nodes
      } else if (file.name.toLowerCase().endsWith(".csv")) { // This one is for csv
        network = parseAdjacencyCSV(text); // Parse CSV content
      } else throw new Error("Unsupported file type. Use .json or .csv"); 
      const baseName = file.name.replace(/\.[^/.]+$/, "").trim(); // Extract base name without extension
      if (!baseName) throw new Error("Empty filename"); 
      
      const exists = // Check for name conflicts with built-in and custom templates (when you import a template it gets added to the custom templates list)
        ["Hopfield Connectivity", "Rectangular Connectivity", "Triangular Connectivity"] 
          .includes(baseName) ||
        customTemplates.some((t) => t.name.toLowerCase() === baseName.toLowerCase());
      if (exists) {
        alert(`A template named "${baseName}" already exists. Please rename your file and try again.`);
        return;
      }
      setCustomTemplates((prev) => [ // Add the new template to custom templates
        ...prev, // Append to existing custom templates
        { name: baseName, data: network, createdAt: Date.now() }, 
      ]);
} catch (err) {
       alert("Import failed: " + (err?.message || "Unknown error")); // Error handling
     }
   };

   // Handle saving/exporting the current template
  const handleSaveTemplate = () => {
    const { graph } = getInstances();
    if (!graph) return alert("Graph not ready yet."); // Ensure graph instance is available
    const net = serializeGraph(graph); // Serialize the graph to network format
    let name = saveName.trim() || "network"; // Default name if none provided
    name = name.replace(/[\/\\:*?"<>|]/g, "_"); 

    if (saveFormat === "json") { // Handle JSON export
      if (!name.toLowerCase().endsWith(".json")) name += ".json"; 
      downloadText(name, JSON.stringify(net, null, 2)); // Download as JSON file
    } else {
      if (!name.toLowerCase().endsWith(".csv")) name += ".csv"; // Handle CSV export 
      const csv = toAdjacencyCSV(net, { includeLayout: true }); // Convert to CSV format
      downloadText(name, csv); // Download as CSV file
    }

    setSaveOpen(false); // Close the save modal
    setSaveName(""); // Reset the name input
  };

   const toggleMode = (newMode) => {
    // Single state update; toggle between the requested mode and idle
    setMode((prev) => (prev === newMode ? "idle" : newMode));
  };

  if (!open) return null;

  // Base button styles for reuse
  const baseButton = {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#eaf4ff",
    cursor: "pointer",
    fontWeight: 600,
    fontFamily: "arial, sans-serif",
  };

  // Render the ToolsMenu component
  return (
    <div className="generate-tools-menu">

      <div className="title">Graph Tools</div>

      {/* Mode Toggle */}
      <div style={{ display: "flex", gap: 8 }}> 
        {/* Buttons for Add, Drag, Delete modes */}
        <button 
          onClick={() => toggleMode("add")}
          style={{
            ...baseButton, background: mode === "add" ? "#28a745" : baseButton.background,}}>
          Add
        </button>
        <button
          onClick={() => toggleMode("drag")}
          style={{
            ...baseButton,background: mode === "drag" ? "#007bff" : baseButton.background,}}
        >
          Drag
        </button>
        <button
          onClick={() => toggleMode("delete")}
          style={{
            ...baseButton,background: mode === "delete" ? "#dc3545" : baseButton.background,}}
        >
          Delete
        </button>
      </div>

      {/* Node/Template Switch */}
      <div>
        <select
          value={objectType}
          onChange={(e) => setObjectType(e.target.value)}
          className="node_or_template"
        >
          {/* Options for Node and Template types */}
          <option value="node" style={{ color: "#000", fontFamily: "arial, sans-serif" }}>
            Node
          </option>
          <option value="template" style={{ color: "#000", fontFamily: "arial, sans-serif" }}>
            Template
          </option>
        </select>
      </div>
 
      {/* Clear All Button */}
      <button
        onClick={() => setConfirmOpen(true)}
        style={{ ...baseButton, background: "rgba(255,255,255,0.06)" }}
      >
        Clear All
      </button>

      {/* The three Templates */}
      <div style={{ marginTop: 4 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Templates</div>
        <div className="templates-container">

          {[ 
            { name: "Hopfield Connectivity", builtIn: true },
            { name: "Rectangular Connectivity", builtIn: true },
            { name: "Triangular Connectivity", builtIn: true },
            ...customTemplates.map((t) => ({ ...t, builtIn: false })), // Map custom templates to include builtIn flag
          ].map((t, i) => ( // Render each template option
            // Template item
            <div
              key={t.name} 
              onClick={() => { // Select template on click
                setSelectedTemplate(t.name);
              }}
              // Draggable for custom templates
              draggable={!t.builtIn}
              onDragStart={(e) => {
                if (t.builtIn) return;

                e.dataTransfer.setData("application/x-template-name", t.name);
                e.dataTransfer.effectAllowed = "copy";
              }}
              className={`template-item` + (selectedTemplate === t.name ? " is-selected" : "") + (i === customTemplates.length + 2 ? " no-border" : "")}
            >
              {/* Template Name and Labels (Built-in/Imported) */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>
                  {t.name}{" "}

                  <span
                      className={`template-label ${t.builtIn ? "built-in" : "imported"}`}
                    >
                      {t.builtIn ? "Built-in" : "Imported"}
                    </span>


                  </span>
              </div>
              {!t.builtIn && (
                <div style={{ display: "flex", gap: 6 }}>
                  {/* Pencil (rename) */}
                  <button
                    aria-label={`Rename ${t.name}`}
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newName = prompt("Rename template:", t.name)?.trim();
                      if (!newName || newName === t.name) return;
                      const conflict =
                        ["Hopfield Connectivity", "Rectangular Connectivity", "Triangular Connectivity"].includes(newName) ||
                        customTemplates.some((ct) => ct.name.toLowerCase() === newName.toLowerCase());
                      if (conflict) {
                        alert(`A template named "${newName}" already exists. Choose a different name.`);
                        return;
                      }
                      setCustomTemplates(prev =>
                        prev.map((ct) => (ct.name === t.name ? { ...ct, name: newName } : ct))
                      );
                      if (selectedTemplate === t.name) setSelectedTemplate(newName);
                    }}
                   className= "pencil-icon">✎
                  </button>

                  {/* Trash (delete) */}
                  <button
                    aria-label={`Delete ${t.name}`}
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
                      try {
                        setCustomTemplates((prev) => prev.filter((ct) => ct.name !== t.name));
                        if (selectedTemplate === t.name) setSelectedTemplate("Hopfield Connectivity");
                      } catch (err) {
                        alert("Deletion failed: " + (err?.message || "Unknown error"));
                      }
                    }}
                    className="delete-icon"
                  >
                    🗙
                  </button>
                </div>)} </div>))}
         </div>
       </div>
       

      {/* connection probability field */}
      {(
        selectedTemplate === "Hopfield Connectivity" ||
        selectedTemplate === "Rectangular Connectivity" ||
        selectedTemplate === "Triangular Connectivity" ||
        (!["Hopfield Connectivity", "Rectangular Connectivity", "Triangular Connectivity"]
          .includes(selectedTemplate) && selectedTemplate) 
      ) && (
       <div
  className="dynamic-inputs-container"
  style={{
    display: "flex",
    alignItems: "flex-start",
    gap: "1.3rem",
    width: 400,
    flexWrap: "wrap",
  }}
>
  {/* Connection Probability */}
  <div
    className="dynamic-input-group"
    style={{
      width: 154, // wider left section
      display: "flex",
      flexDirection: "column",
    }}
  >
    <label
      style={{
        display: "block",
        fontSize: 13,
        marginBottom: 4,
        fontWeight: 500,
      }}
    >
      Connection Probability (%)
    </label>
    <input
      type="number"
      min="0"
      max="100"
      value={connectionProb}
      onChange={(e) => setConnectionProb(e.target.value)}
      className="dynamic-inputs-mar"
    />
  </div>

  {/* Force Connectedness */}
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      marginTop: 0,
    }}
  >
    <label
      style={{
        fontSize: 13,
        fontWeight: 500,
        whiteSpace: "nowrap",
        marginBottom: 6,
      }}
    >
      Force Connectedness?
    </label>
    <input
      type="checkbox"
      checked={ensureConnected}
      onChange={(e) => setEnsureConnected(e.target.checked)}
      style={{
        transform: "scale(1.2)",
        cursor: "pointer",
        marginTop: 6,
      }}
    />
  </div>
</div>
        
      )}
      {/* Dynamic Inputs (The three templates) */}
      {selectedTemplate === "Hopfield Connectivity" && (
        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
            Node Count
          </label>
          <input
            type="number"
            min="1"
            value={hopfieldCount}
            onChange={(e) => setHopfieldCount(e.target.value)}
            className="dynamic-inputs"
          />
        </div>
      )}
    {(selectedTemplate === "Rectangular Connectivity" ||
      selectedTemplate === "Triangular Connectivity") && (
      <div className="dynamic-inputs-container">
        <div className="dynamic-input-group">
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
            Rows
          </label>
          <input
            type="number"
            min="1"
            value={
              selectedTemplate === "Rectangular Connectivity"
                ? rectRows
                : triRows
            }
            onChange={(e) => /* Set rows based on selected template */
              selectedTemplate === "Rectangular Connectivity"
                ? setRectRows(e.target.value)
                : setTriRows(e.target.value)
            }
            className="dynamic-inputs-mar"
          />
        </div>

        <div className="dynamic-input-group">
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
            Columns
          </label>
          <input
            type="number"
            min="1"
            value={
              selectedTemplate === "Rectangular Connectivity"
                ? rectCols
                : triCols
            }
            onChange={(e) => /* Set columns based on selected template */
              selectedTemplate === "Rectangular Connectivity"
                ? setRectCols(e.target.value)
                : setTriCols(e.target.value)
            }
            className="dynamic-inputs-mar"
          />
        </div>
      </div>
    )}
    {selectedTemplate === "Triangular Connectivity" && (
      <div>
        <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
          Radius
        </label>
        <input
          type="number"
          min="1"
          value={triRadius}
          onChange={(e) => setTriRadius(e.target.value)}
          className="dynamic-inputs"
        />
      </div>
    )}
      {/*Import/Export buttons*/}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        <label
          style={{
            ...baseButton, textAlign: "center",fontSize: "14px",fontWeight: 600,lineHeight: "1.4",display: "flex",alignItems: "center",justifyContent: "center",}}
        >
          Import Template
          <input
            type="file"
            accept=".json,.csv"
            onChange={(e) => handleImportFile(e.target.files?.[0])}
            style={{ display: "none" }}
          />
        </label>
        <button
          onClick={() => setSaveOpen(true)}
          style={{ ...baseButton, textAlign: "center" }}
        >
          Export Template
        </button>
      </div>

      {/* Clear all confirmation modal*/}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div style={{ marginBottom: 16 }}>
          Are you sure? You will lose all your progress.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
          
            onClick={() => {
              setConfirmOpen(false);
              onClearAll?.();
            }}
            className="clearall-not-ok"
          >
            Yes
          </button>
          <button
            onClick={() => setConfirmOpen(false)}
            className="clearall-not"
          >
            No
          </button>
        </div>
      </Modal>

      {/* Export Template Modal */}
      <Modal open={saveOpen} onClose={() => setSaveOpen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label>
            Name:
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="export-name"
            />
          </label>

          <label>
            Format:
            <select
              value={saveFormat}
              onChange={(e) => setSaveFormat(e.target.value)}
              className="export-format"
             >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </label>

          <div
           className="export-buttons"
          >
            <button
              onClick={() => setSaveOpen(false)}
              className="export-cancel"
            >
              Cancel
            </button>
            <button
             type="button"
              onClick={handleSaveTemplate}
              className="export-ok"
            >
              OK
            </button>
          </div>
        </div>
      </Modal>

      <button
        onClick={() => window.open("https://www.youtube.com/watch?v=YmuU0GYFRfA", "_blank")}
        style={{ ...baseButton, textAlign: "center" }}
      >
        Watch Tutorial on YouTube
      </button>
    </div>
  );
}
