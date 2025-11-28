function hexToRgb(hex) {
const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

function lerp(a, b, t) { return a + (b - a) * t; }

function buildLUT(stops, size = 256) {

const lut = new Array(size);
for (let i = 0; i < size; i++) {
const t = i / (size - 1);

let s0 = stops[0];
let s1 = stops[stops.length - 1];
for (let k = 0; k < stops.length - 1; k++) {
if (t >= stops[k].pos && t <= stops[k + 1].pos) {
s0 = stops[k];
s1 = stops[k + 1];
break;
}
}
const localT = (t - s0.pos) / Math.max(1e-9, (s1.pos - s0.pos));
const [r0, g0, b0] = hexToRgb(s0.color);
const [r1, g1, b1] = hexToRgb(s1.color);
lut[i] = [
Math.round(lerp(r0, r1, localT)),
Math.round(lerp(g0, g1, localT)),
Math.round(lerp(b0, b1, localT)),
];
}
return lut;
}

const VIRIDIS_STOPS = [
{ pos: 0.00, color: '#440154' },
{ pos: 0.13, color: '#482173' },
{ pos: 0.25, color: '#3e4989' },
{ pos: 0.38, color: '#31688e' },
{ pos: 0.50, color: '#26828e' },
{ pos: 0.63, color: '#1f9e89' },
{ pos: 0.75, color: '#35b779' },
{ pos: 0.88, color: '#6ece58' },
{ pos: 1.00, color: '#fde725' },
];


const PLASMA_STOPS = [
{ pos: 0.00, color: '#0d0887' },
{ pos: 0.13, color: '#46039f' },
{ pos: 0.25, color: '#7201a8' },
{ pos: 0.38, color: '#9c179e' },
{ pos: 0.50, color: '#bd3786' },
{ pos: 0.63, color: '#d8576b' },
{ pos: 0.75, color: '#ed7953' },
{ pos: 0.88, color: '#fb9f3a' },
{ pos: 1.00, color: '#f0f921' },
];


const INFERNO_STOPS = [
{ pos: 0.00, color: '#000004' },
{ pos: 0.13, color: '#180f3d' },
{ pos: 0.25, color: '#400e72' },
{ pos: 0.38, color: '#6a176e' },
{ pos: 0.50, color: '#932667' },
{ pos: 0.63, color: '#bc3754' },
{ pos: 0.75, color: '#dd513a' },
{ pos: 0.88, color: '#f37819' },
{ pos: 1.00, color: '#fdea45' },
];


const MAGMA_STOPS = [
{ pos: 0.00, color: '#000004' },
{ pos: 0.13, color: '#1a0b3a' },
{ pos: 0.25, color: '#3a0f70' },
{ pos: 0.38, color: '#5c1e88' },
{ pos: 0.50, color: '#7e2482' },
{ pos: 0.63, color: '#a42c60' },
{ pos: 0.75, color: '#c93d3a' },
{ pos: 0.88, color: '#e8601c' },
{ pos: 1.00, color: '#fbdf72' },
];


const CIVIDIS_STOPS = [
{ pos: 0.00, color: '#00224e' },
{ pos: 0.13, color: '#213f6e' },
{ pos: 0.25, color: '#3d5a84' },
{ pos: 0.38, color: '#5a768e' },
{ pos: 0.50, color: '#7b8f91' },
{ pos: 0.63, color: '#9da78f' },
{ pos: 0.75, color: '#c0be84' },
{ pos: 0.88, color: '#dfd17a' },
{ pos: 1.00, color: '#fde945' },
];



const BWR_STOPS = [
{ pos: 0.00, color: '#2b6cb0' }, // dark blue
{ pos: 0.22, color: '#4299e1' }, // lighter blue
{ pos: 0.50, color: '#ffffff' }, // white center
{ pos: 0.78, color: '#feb2b2' }, // light red
{ pos: 1.00, color: '#c53030' }, // dark red
];


const MAP_DEFS = [
{ key: 'blueWhiteRed', label: 'Blue–White–Red', stops: BWR_STOPS, isDiverging: true, center: 0 },
{ key: 'viridis', label: 'Viridis', stops: VIRIDIS_STOPS },
{ key: 'plasma', label: 'Plasma', stops: PLASMA_STOPS },
{ key: 'inferno', label: 'Inferno', stops: INFERNO_STOPS },
{ key: 'magma', label: 'Magma', stops: MAGMA_STOPS },
{ key: 'cividis', label: 'Cividis', stops: CIVIDIS_STOPS },

];

const CACHE = new Map();


export function getAvailableColormaps() {
return MAP_DEFS.map(({ key, label, isDiverging }) => ({ key, label, isDiverging: !!isDiverging }));
}


export function getColormap(name = 'blueWhiteRed') {
  
  const def = MAP_DEFS.find(d => d.key === name);
  if (!def) {
    console.warn(`[colormaps] Unknown map "${name}". Falling back to blueWhiteRed.`);
    return getColormap('blueWhiteRed');
  }

  if (CACHE.has(def.key)) return CACHE.get(def.key);

  const lut = buildLUT(def.stops, 256);
  const info = {
    key: def.key,
    label: def.label,
    lut,
    isDiverging: !!def.isDiverging,
    center: def.center ?? null,
    stops: def.stops,
  };
  CACHE.set(def.key, info);
  return info;
}


export function sampleCssGradient(name) {
const def = MAP_DEFS.find(d => d.key === name) || MAP_DEFS[0];
const parts = def.stops.map(s => `${s.color} ${Math.round(s.pos * 100)}%`);
return `linear-gradient(90deg, ${parts.join(', ')})`;
}


export function getTextColorForBackground(rgb) {
  const [r, g, b] = rgb;
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
  return brightness < 128 ? "#fff" : "#000";  
}