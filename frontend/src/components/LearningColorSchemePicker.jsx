import React from 'react';
import { getAvailableColormaps, sampleCssGradient } from "./Learningcolormaps";



export default function ColorSchemePicker({ value, onChange }) {
const maps = getAvailableColormaps();


return (
<div>
<label style={{ fontSize: 12, opacity: 0.9, marginBottom: 6, display: 'block' }}>Color scheme</label>
<div
role="radiogroup"
aria-label="Color scheme"
style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}
>
{maps.map((m) => (
<button
key={m.key}
role="radio"
aria-checked={value === m.key}
onClick={() => onChange(m.key)}
onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(m.key); } }}
title={m.label + (m.isDiverging ? ' (diverging)' : '')}
style={{
height: 40,
borderRadius: 10,
border: value === m.key ? '2px solid #1a6fd6' : '1px solid rgba(255,255,255,0.2)',
backgroundImage: sampleCssGradient(m.key),
backgroundSize: '100% 100%',
cursor: 'pointer',
outline: 'none',
boxShadow: value === m.key ? '0 0 0 3px rgba(26,111,214,0.35)' : 'none',
}}
>
<span style={{
backdropFilter: 'brightness(0.9) contrast(1.1)',
background: 'rgba(0,0,0,0.25)',
color: '#fff',
fontWeight: 700,
fontSize: 12,
padding: '2px 6px',
borderRadius: 6,
marginLeft: 6,
}}>{m.label}</span>
</button>
))}
</div>
</div>
);
}