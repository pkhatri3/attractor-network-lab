import React from 'react';
import { Handle, Position } from 'reactflow';

function CircleNode({ data }) {
  const bgColor = data.selected ? '#4A90E2' : '#0D47A1';

  return (
    <div
      style={{
        width: 50,
        height: 50,
        borderRadius: '50%',
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 12,
        position: 'relative',
        cursor: 'pointer',
      }}
      onClick={data.onClick} // click to connect
    >
      {data.label}
      <Handle
        type="source"
        position={Position.Center} // single handle in the center, but still looks weird not sure why
        id="universal"
        style={{ opacity: 0, width: 0, height: 0, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      />
      <Handle
        type="target"
        position={Position.Center} // same handle for target
        id="universal"
        style={{ opacity: 0, width: 0, height: 0, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      />
    </div>
  );
}

export default CircleNode;
