import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useEdgesState,
  useNodesState,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CircleNode from './CircleNode';
import { generateNodes, generateEdges } from './templates';
// import * as htmlToImage from 'html-to-image';
import domtoimage from 'dom-to-image-more';
import download from 'downloadjs';

const nodeTypes = { circle: CircleNode };


const initialNodes = [
  { id: '1', type: 'circle', position: { x: 100, y: 100 }, data: { label: 'N1' } },
  { id: '2', type: 'circle', position: { x: 400, y: 100 }, data: { label: 'N2' } },
  { id: '3', type: 'circle', position: { x: 200, y: 250 }, data: { label: 'N3' } },
];

// This below tests how the app functions with 1000 nodes. Right now it sucks and lags
// We should ask how many nodes there could be in a realistic use case

// const initialNodes = Array.from({ length: 1000 }, (_, i) => ({
//   id: `${i + 1}`,
//   type: 'circle',
//   position: {
//     x: Math.random() * 1000
//     y: Math.random() * 1000
//   },
//   data: { label: `N${i + 1}` },
// }));

const initialEdges = [
  { id: '1-3', source: '1', target: '3', type: 'straight' },
];

function Sandbox() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [addingNode, setAddingNode] = useState(false);
  const [rfInstance, setRfInstance] = useState(null);
  const [gridMode, setGridMode] = useState(false);
  const flowWrapper = React.useRef(null);
  const handleNodeClick = useCallback(
    (nodeId) => {
      if (!selectedNode) {
        setSelectedNode(nodeId); // first click
      } else if (selectedNode === nodeId) {
        setSelectedNode(null); // upon self-select, deselect
      } else {
        const existingEdge = edges.find(
          (e) =>
            (e.source === selectedNode && e.target === nodeId) ||
            (e.source === nodeId && e.target === selectedNode)
        );

        if (existingEdge) { // if there is an edge already, remove it
          setEdges((eds) => eds.filter((e) => e.id !== existingEdge.id));
        } else { // if not, add one
          setEdges((eds) => [
            ...eds,
            { id: `${selectedNode}-${nodeId}`, source: selectedNode, target: nodeId, type: 'straight' },
          ]);
        }
        setSelectedNode(null);
      }
    },
    [selectedNode, edges, setEdges]
  );

  const handlePaneClick = useCallback(
    (event) => {
        if (!addingNode || !rfInstance) return;

        let position = rfInstance.screenToFlowPosition({
        x: event.clientX - 50,
        y: event.clientY - 50,
        });
        if (gridMode) {
          position = {
            x: snap(position.x, 25),
            y: snap(position.y, 25),
          };
    }
        
  
        const newNode = {
        id: `${nodes.length + 1}`,
        type: 'circle',
        position,
        data: { label: `N${nodes.length + 1}` },
        };

        setNodes((nds) => [...nds, newNode]);
        setAddingNode(false);
    },
    [addingNode, nodes.length, rfInstance]
    );

  const handleHopfield = useCallback(() => {
    const input = window.prompt("How many nodes do you want?");
    if (!input) return;

    const newNodes = generateNodes(input).map((n, idx) => ({
      ...n,
      id: `${nodes.length + idx + 1}`,
      data: { label: `N${nodes.length + idx + 1}` },
    }));

    const newEdges = generateEdges(newNodes);

    setNodes((prev) => [...prev, ...newNodes]);
    setEdges((prev) => [...prev, ...newEdges]);
  }, [nodes.length, setNodes, setEdges]);

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== selectedNode && e.target !== selectedNode
      )
    );
    setSelectedNode(null);
  };

  const handleSaveImage = async () => {
    if (!flowWrapper.current) return;
    const name = window.prompt("Enter a name for your architecture image:", "architecture");

    try {
      const reactFlowElement = flowWrapper.current.querySelector('.react-flow');
      const dataUrl = await domtoimage.toPng(reactFlowElement, {
        backgroundColor: '#1e1e1e',
      });
      download(dataUrl, `${name || 'architecture'}.png`);
    } catch (error) {
      console.error('Failed to save image:', error);
    }
  };

  const handleClearAll = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  };


  
  const nodesWithClick = nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      onClick: () => handleNodeClick(n.id),
      selected: selectedNode === n.id,
    },
  }));
  const snap = (v, step) => Math.round(v / step) * step;
  const onNodesChangeSnapped = useCallback(
  (changes) => {
    const next = gridMode
      ? changes.map((c) =>
          c.type === 'position' && c.position
            ? { ...c, position: { x: snap(c.position.x, 25), y: snap(c.position.y, 25) } }
            : c
        )
      : changes;

    onNodesChange(next);
  },
  [gridMode, onNodesChange]
);


  return (
    /* the embedded css is necessary here, doesn't work otherwise */
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
    
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 1000,
        display: 'flex',
        gap: 8,
        padding: '8px 10px',
        background: 'rgba(0,0,0,0.6)',
        color: 'white',
        borderRadius: 8,
        alignItems: 'center',
        pointerEvents: 'auto',
      }}
    >
      <button onClick={() => setAddingNode(true)}>Add Node</button>
      <button onClick={handleDeleteNode}>Delete Node</button>
      <button onClick={() => setGridMode((g) => !g)}>
        {gridMode ? 'Switch to Freeform' : 'Switch to Grid'}
      </button>
      <button onClick={handleHopfield}>Hopfield Network</button>
      <button onClick={handleSaveImage}>Save Image</button>
      <button onClick={handleClearAll}>Clear All</button>
    </div>

    <div ref={flowWrapper} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodesWithClick}
        edges={edges}
        onNodesChange={onNodesChangeSnapped}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        nodesConnectable={false}
        elementsSelectable={true}
        onInit={setRfInstance}
        onPaneClick={handlePaneClick}
        snapToGrid={gridMode}
        snapGrid={[25, 25]}
      >
        <Controls />
        <Background
        color="#5a5a5aff"
        gap={25}
        variant={gridMode ? BackgroundVariant.Lines : BackgroundVariant.Dots}
        />
      </ReactFlow>
    </div>
  </div>
  );
}

export default Sandbox;
