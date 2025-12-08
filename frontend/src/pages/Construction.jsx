// Import necessary libraries and components
import React, { useState, useRef, useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import { GraphContext } from "../GraphContext";
import GraphCanvas from "../components/GraphCanvas";
import MenuButton from "../components/MenuButton";
import ToolsMenu from "../components/ToolsMenu";
import "../styles/Construction.css";
import { serializeGraph } from "../utils/ioUtils";

export default function Construction() { // Construction Page Component

// Graph Context & States (True or False)

const { setNetwork } = useContext(GraphContext); // Used to update the global graph data
const { commitGraph } = useContext(GraphContext); // Used to finalize or sync graph changes

// Controls whether the left tools menu is visible or hidden
const [menuOpen, setMenuOpen] = useState(true);

// Toggles between freeform mode and grid-based layout mode
const [gridMode, setGridMode] = useState(false);

// Represents the current user action mode: idle, add, drag, delete, and the rest.
const [mode, setMode] = useState("idle");

// Whether the user is currently adding a single node or template.
const [objectType, setObjectType] = useState("node"); // default is single node mode

// Keeps track of which template is selected in the tools menu
const [selectedTemplate, setSelectedTemplate] = useState("Hopfield Connectivity"); // default template

// Access and modify custom templates from shared graph context
const { customTemplates, setCustomTemplates } = useContext(GraphContext);

// Default probability for connections between nodes.  
const [connectionProb, setConnectionProb] = useState(100);

// Keeps track of if the "Ensure Connected?" field is checked
const [ensureConnected, setEnsureConnected] = useState(false);

// Default number of nodes for Hopfield networks
const [hopfieldCount, setHopfieldCount] = useState("12");

// Default grid dimensions for rectangular layout
const [rectRows, setRectRows] = useState("3");
const [rectCols, setRectCols] = useState("4");

// Default grid dimensions for hexagonal layout
const [hexRows, setHexRows] = useState("4");
const [hexCols, setHexCols] = useState("6");
const [hexRadius, setHexRadius] = useState("1");


// Stores reference to the graph clearing function (used by Clear All)
const clearGraphFnRef = useRef(null);

// Keeps track of Sigma and Graph instances. This one is passed to ToolsMenu and GraphCanvas.
const graphRefs = useRef({});

// Keeps track of the previous grid mode value for detecting changes
const prevGridModeRef = useRef(gridMode);

// The next consts are helper functions for graph operations

// Clears the current graph (nodes + edges) when invoked
const handleClearAll = () => {
  if (clearGraphFnRef.current) clearGraphFnRef.current();
};

// Checks if the current graph has visible, non-anchor nodes.
const hasVisibleContent = () => {
  const g = graphRefs.current.graphRef?.current;
  if (!g) return false;
  const visibleNodes = g.nodes().filter(id => !g.getNodeAttribute(id, "isAnchor"));
  return visibleNodes.length > 0 || g.size > 0;
};


// Toggles between Grid Mode (structured layout) and Freeform Mode.
const handleToggleGrid = () => {
  if (!gridMode) {
    // Only ask if there’s existing content in the graph
    const needsAsk = hasVisibleContent();
    if (needsAsk) {
      const ok = window.confirm(
        "Switch to Grid Mode?\n\nThis action will CLEAR all existing nodes and connections.\n" +
        "Make sure to save or export your work before proceeding."
      );
      if (!ok) return; // User cancelled, nothing to do.
    }
    // Clear graph before switching into grid mode. This is what the customer expects.
    clearGraphFnRef.current?.();
    setGridMode(true);
  } else {
    //  when switching back to freeform, no need to clear graph.
    setGridMode(false);
  }
};

  // Extra safety: if gridMode flips from anywhere, clear on entering grid.
  useEffect(() => {
    if (prevGridModeRef.current !== gridMode) {
      if (gridMode) {
        clearGraphFnRef.current?.();
      }
      prevGridModeRef.current = gridMode;
    }
  }, [gridMode]);

  // Commits the current graph state before transitioning to Learning phase
  const handleGoToLearning = () => {
    const graph = graphRefs.current.graphRef?.current;
    if (graph) commitGraph(serializeGraph(graph));
  };

  // Main Render for Construction Page
  return (
    
    <div className="sandbox-container">
      {/* Menu Toggle  */}
      <MenuButton onClick={() => setMenuOpen((o) => !o)} isOpen={menuOpen} />

      {/* Grid Toggle */}
      <button
        onClick={handleToggleGrid}
        aria-pressed={gridMode}
        className={`grid-toggle ${gridMode ? "active" : ""}`} // Button styling changes based on gridMode state

      >
        {/* Button text changes based on current mode */}
        {gridMode ? "Switch to freeform" : "Switch to grid"}
      </button>

      {/* Transition to Learning Phase */}
      <Link
        to="/learning"
        onClick={handleGoToLearning}
        className="go-to-learning-btn"
      >
        Go to Learning
      </Link>

      {/* Tools Menu */}
      {/* Renders the left-side tools menu with various controls and options */}
      <ToolsMenu
        open={menuOpen}
        mode={mode}
        setMode={setMode}
        gridMode={gridMode}
        connectionProb={connectionProb}
        setConnectionProb={setConnectionProb}
        ensureConnected={ensureConnected}
        setEnsureConnected={setEnsureConnected}
        hopfieldCount={hopfieldCount}
        setHopfieldCount={setHopfieldCount}
        rectRows={rectRows}
        setRectRows={setRectRows}
        rectCols={rectCols}
        setRectCols={setRectCols}
        hexRows={hexRows}
        setHexRows={setHexRows}
        hexCols={hexCols}
        setHexCols={setHexCols}
        hexRadius={hexRadius}
        setHexRadius={setHexRadius}
        onClearAll={handleClearAll}
        graphRefs={graphRefs}
        setNetwork={setNetwork}
        objectType={objectType}
        setObjectType={setObjectType}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        customTemplates={customTemplates}
        setCustomTemplates={setCustomTemplates}
        prevGridModeRef={prevGridModeRef}
      />

      {/* Main Graph Canvas */}
      <GraphCanvas
        mode={mode}
        gridMode={gridMode}
        nodeSizePreset={"medium"}
        connectionProb={connectionProb}
        ensureConnected={ensureConnected}
        hopfieldCount={hopfieldCount}
        rectRows={rectRows}
        rectCols={rectCols}
        hexRows={hexRows}
        hexCols={hexCols}
        hexRadius={hexRadius}
        objectType={objectType}
        selectedTemplate={selectedTemplate}
        customTemplates={customTemplates}
        onClearGraph={(fn) => (clearGraphFnRef.current = fn)}
        onGraphRefs={(refs) => (graphRefs.current = refs)}
      />
    </div>
  );
}
