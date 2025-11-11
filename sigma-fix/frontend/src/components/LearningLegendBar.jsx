import React from 'react';
import { getColormap, sampleCssGradient } from './Learningcolormaps';


export default function LegendBar({ min, max, mapName }) {
const map = getColormap(mapName);
const hasZeroTick = map.isDiverging && min < (map.center ?? 0) && max > (map.center ?? 0);


return (
<div style={{ width: '100%', marginTop: 12 }} aria-label="Color legend">
<div style={{ height: 14, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', backgroundImage: sampleCssGradient(mapName) }} />
<div style={{ display: 'flex', justifyContent: hasZeroTick ? 'space-between' : 'space-between', fontSize: 12, opacity: 0.85, marginTop: 6 }}>
<span>{Number.isFinite(min) ? min.toFixed(2) : 'min'}</span>
{hasZeroTick && <span>0</span>}
<span>{Number.isFinite(max) ? max.toFixed(2) : 'max'}</span>
</div>
</div>
);
}