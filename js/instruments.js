// Instrument catalog. Every instrument is drawn in REAL MILLIMETRES, centered on
// the origin (0,0), so it drops onto the mm-scaled panel stage at true size.
//
// Each entry: { id, name, category, w, h, svg() }  — svg() returns the inner
// markup of a <g>, spanning -w/2..w/2 (x) and -h/2..h/2 (y).

(function () {
const IN = 25.4; // mm per inch

/* ----------------------------------------------------------------------------
 * Idealized round instruments (3-1/8")
 * Standard 3-1/8 instrument: ~84 mm square bezel, ~80.5 mm dial cutout.
 * -------------------------------------------------------------------------- */

const ROUND_BEZEL = 84;   // mm, square bezel
const DIAL_R = 38;        // mm, dial radius (Ø76)

function bezel() {
  const s = ROUND_BEZEL / 2;
  const screw = 3;
  const o = s - 6;
  return `
    <rect class="sel-outline" x="${-s}" y="${-s}" width="${ROUND_BEZEL}" height="${ROUND_BEZEL}" rx="5"/>
    <rect x="${-s}" y="${-s}" width="${ROUND_BEZEL}" height="${ROUND_BEZEL}" rx="6" fill="#1b1b1d" stroke="#0a0a0b" stroke-width="0.6"/>
    <circle cx="0" cy="0" r="${DIAL_R + 1.5}" fill="#2a2a2d"/>
    <circle cx="0" cy="0" r="${DIAL_R}" fill="#0c0c0e" stroke="#3a3a40" stroke-width="0.5"/>
    ${[[-o,-o],[o,-o],[-o,o],[o,o]].map(([x,y]) =>
      `<circle cx="${x}" cy="${y}" r="${screw/2}" fill="#3a3a40"/>`).join('')}
  `;
}

// tick marks around a dial; returns marks from angle a0..a1 every step degrees
function ticks(count, r1, r2, opts = {}) {
  const { stroke = '#cfd6dd', width = 0.6, start = -90, sweep = 360 } = opts;
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = (start + (sweep * i) / count) * Math.PI / 180;
    const x1 = Math.cos(a) * r1, y1 = Math.sin(a) * r1;
    const x2 = Math.cos(a) * r2, y2 = Math.sin(a) * r2;
    out += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${stroke}" stroke-width="${width}"/>`;
  }
  return out;
}

function dialLabel(text) {
  return `<text x="0" y="${DIAL_R - 8}" text-anchor="middle" font-size="5" fill="#7d858d" font-family="sans-serif">${text}</text>`;
}

function roundFace(inner, label) {
  return `<g>${bezel()}<g clip-path="">${inner}</g>${dialLabel(label)}</g>`;
}

const attitude = () => roundFace(`
  <clipPath id="ai-clip"><circle cx="0" cy="0" r="${DIAL_R - 2}"/></clipPath>
  <g clip-path="url(#ai-clip)">
    <rect x="-40" y="-40" width="80" height="42" fill="#2f7fc4"/>
    <rect x="-40" y="2" width="80" height="40" fill="#7a4a22"/>
    <rect x="-40" y="0.5" width="80" height="1.4" fill="#e8edf0"/>
    ${[-20,-10,10,20].map(p => `<line x1="${p>0||p<0?-8:-8}" y1="${p*0.6}" x2="8" y2="${p*0.6}" stroke="#e8edf0" stroke-width="0.6"/>`).join('')}
  </g>
  <path d="M -14 0 L -5 0 M 14 0 L 5 0 M 0 -3 L 0 3" stroke="#ffb000" stroke-width="1.4" fill="none"/>
  <circle cx="0" cy="0" r="1.4" fill="#ffb000"/>
  <path d="M 0 ${-(DIAL_R-3)} l -3 -5 l 6 0 z" fill="#ffb000"/>
`, 'ATTITUDE');

const airspeed = () => roundFace(`
  ${ticks(20, DIAL_R-2, DIAL_R-6, {})}
  ${ticks(10, DIAL_R-2, DIAL_R-8, { width: 1 })}
  <path d="M 0 0 L ${Math.cos(2.3)*(DIAL_R-9)} ${Math.sin(2.3)*(DIAL_R-9)}" stroke="#fff" stroke-width="1.4"/>
  <circle r="2" fill="#cfd6dd"/>
  <text x="0" y="-6" text-anchor="middle" font-size="6" fill="#8c949c" font-family="sans-serif">KIAS</text>
`, 'AIRSPEED');

const altimeter = () => roundFace(`
  ${ticks(10, DIAL_R-2, DIAL_R-7, { width: 1 })}
  ${ticks(50, DIAL_R-2, DIAL_R-4, { width: 0.4 })}
  <path d="M 0 0 L ${Math.cos(-1.2)*(DIAL_R-10)} ${Math.sin(-1.2)*(DIAL_R-10)}" stroke="#fff" stroke-width="1"/>
  <path d="M 0 0 L ${Math.cos(2.1)*(DIAL_R-16)} ${Math.sin(2.1)*(DIAL_R-16)}" stroke="#fff" stroke-width="2.2"/>
  <circle r="2" fill="#cfd6dd"/>
  <text x="0" y="-6" text-anchor="middle" font-size="5" fill="#8c949c" font-family="sans-serif">ALT ft</text>
`, 'ALTIMETER');

const vsi = () => roundFace(`
  ${ticks(10, DIAL_R-2, DIAL_R-6, {})}
  <line x1="${-(DIAL_R-2)}" y1="0" x2="${-(DIAL_R-6)}" y2="0" stroke="#fff" stroke-width="1"/>
  <line x1="${DIAL_R-2}" y1="0" x2="${DIAL_R-6}" y2="0" stroke="#fff" stroke-width="1"/>
  <path d="M 0 0 L ${DIAL_R-9} -2" stroke="#fff" stroke-width="1.4"/>
  <circle r="2" fill="#cfd6dd"/>
  <text x="-8" y="2.5" font-size="5" fill="#8c949c" font-family="sans-serif">0</text>
  <text x="0" y="-12" text-anchor="middle" font-size="4.5" fill="#8c949c" font-family="sans-serif">UP</text>
  <text x="0" y="16" text-anchor="middle" font-size="4.5" fill="#8c949c" font-family="sans-serif">DN</text>
`, 'VSI ×1000');

const dg = () => roundFace(`
  ${ticks(36, DIAL_R-2, DIAL_R-5, { width: 0.5 })}
  ${ticks(12, DIAL_R-2, DIAL_R-8, { width: 1 })}
  <g font-family="sans-serif" fill="#cfd6dd">
    <text x="0" y="${-(DIAL_R-12)}" text-anchor="middle" font-size="6">N</text>
    <text x="${DIAL_R-12}" y="2" text-anchor="middle" font-size="5">E</text>
    <text x="0" y="${DIAL_R-9}" text-anchor="middle" font-size="6">S</text>
    <text x="${-(DIAL_R-12)}" y="2" text-anchor="middle" font-size="5">W</text>
  </g>
  <path d="M 0 ${-(DIAL_R-14)} L -4 0 L 0 6 L 4 0 Z" fill="#ffb000" stroke="#7a5300" stroke-width="0.3"/>
`, 'HEADING');

const turn = () => roundFace(`
  <path d="M -12 4 l 4 -4 l -3 -2 l 4 -3 l 4 3 l -3 2 l 4 4" fill="none" stroke="#e8edf0" stroke-width="1.4"/>
  <text x="-22" y="2" font-size="5" fill="#8c949c" font-family="sans-serif">L</text>
  <text x="18" y="2" font-size="5" fill="#8c949c" font-family="sans-serif">R</text>
  <circle cx="0" cy="14" r="3" fill="none" stroke="#cfd6dd" stroke-width="0.6"/>
  <circle cx="0" cy="14" r="1.4" fill="#111"/>
  <text x="0" y="-4" text-anchor="middle" font-size="4" fill="#8c949c" font-family="sans-serif">2 MIN</text>
`, 'TURN COORD');

/* ----------------------------------------------------------------------------
 * Garmin G3X Touch glass displays — faithful PFD/MFD layout, pure SVG.
 * GDU 460: 10.6" landscape, 275.5 × 198.6 mm bezel.
 * GDU 470: 7"  portrait,  152.7 × 198.6 mm bezel.
 * -------------------------------------------------------------------------- */

// Attitude/PFD block drawn inside rect (x,y,w,h) in the group's mm coords.
function pfd(x, y, w, h) {
  const cx = x + w / 2, cy = y + h / 2;
  const tapeW = Math.min(13, w * 0.16);
  const id = `c${Math.round((x+y+w+h)*7)}`; // semi-unique clip id
  return `
  <clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>
  <g clip-path="url(#${id})">
    <rect x="${x}" y="${y}" width="${w}" height="${h/2}" fill="#2b7fc9"/>
    <rect x="${x}" y="${cy}" width="${w}" height="${h/2}" fill="#6e4a28"/>
    <rect x="${x}" y="${cy-0.5}" width="${w}" height="1" fill="#fff"/>
    <!-- pitch ladder -->
    <g stroke="#fff" stroke-width="0.5" opacity="0.9">
      <line x1="${cx-9}" y1="${cy-h*0.18}" x2="${cx+9}" y2="${cy-h*0.18}"/>
      <line x1="${cx-5}" y1="${cy-h*0.09}" x2="${cx+5}" y2="${cy-h*0.09}"/>
      <line x1="${cx-5}" y1="${cy+h*0.09}" x2="${cx+5}" y2="${cy+h*0.09}"/>
      <line x1="${cx-9}" y1="${cy+h*0.18}" x2="${cx+9}" y2="${cy+h*0.18}"/>
    </g>
    <!-- roll arc -->
    <path d="M ${cx-w*0.3} ${y+h*0.16} A ${w*0.34} ${w*0.34} 0 0 1 ${cx+w*0.3} ${y+h*0.16}"
          fill="none" stroke="#fff" stroke-width="0.5"/>
    <path d="M ${cx} ${y+h*0.05} l -2.2 4 l 4.4 0 z" fill="#ffb000"/>
    <!-- aircraft reference -->
    <path d="M ${cx-13} ${cy} l 6 0 m 14 0 l 6 0" stroke="#ffb000" stroke-width="1.4"/>
    <rect x="${cx-1}" y="${cy-1}" width="2" height="2" fill="#ffb000"/>
    <!-- airspeed tape -->
    <rect x="${x}" y="${y}" width="${tapeW}" height="${h}" fill="#000" opacity="0.55"/>
    <rect x="${x+1}" y="${cy-4}" width="${tapeW-2}" height="8" fill="#11161c" stroke="#fff" stroke-width="0.4"/>
    <text x="${x+tapeW/2}" y="${cy+1.5}" text-anchor="middle" font-size="3.4" fill="#fff" font-family="sans-serif">120</text>
    <!-- altitude tape -->
    <rect x="${x+w-tapeW}" y="${y}" width="${tapeW}" height="${h}" fill="#000" opacity="0.55"/>
    <rect x="${x+w-tapeW+1}" y="${cy-4}" width="${tapeW-2}" height="8" fill="#11161c" stroke="#fff" stroke-width="0.4"/>
    <text x="${x+w-tapeW/2}" y="${cy+1.5}" text-anchor="middle" font-size="3.2" fill="#fff" font-family="sans-serif">3500</text>
    <!-- HSI -->
    <circle cx="${cx}" cy="${y+h-h*0.17}" r="${h*0.13}" fill="#0c1118" stroke="#fff" stroke-width="0.4" opacity="0.92"/>
    <path d="M ${cx} ${y+h-h*0.17-h*0.11} l -2 5 l 4 0 z" fill="#ffb000"/>
    <text x="${cx}" y="${y+h-h*0.17-h*0.135}" text-anchor="middle" font-size="3" fill="#0ad06a" font-family="sans-serif">N</text>
  </g>`;
}

// Moving-map / MFD block.
function mfdMap(x, y, w, h) {
  const id = `m${Math.round((x+y+w+h)*7)}`;
  return `
  <clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>
  <g clip-path="url(#${id})">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#10302a"/>
    <path d="M ${x} ${y+h*0.3} Q ${x+w*0.4} ${y+h*0.5} ${x+w} ${y+h*0.25}" fill="none" stroke="#2f6f5a" stroke-width="1.2"/>
    <path d="M ${x} ${y+h*0.7} Q ${x+w*0.5} ${y+h*0.55} ${x+w} ${y+h*0.8}" fill="none" stroke="#2f6f5a" stroke-width="1.2"/>
    <path d="M ${x+w*0.5} ${y+h} L ${x+w*0.5} ${y+h*0.55} L ${x+w*0.62} ${y+h*0.3}" fill="none" stroke="#d34de0" stroke-width="0.8" stroke-dasharray="2 1.5"/>
    <path d="M ${x+w*0.5} ${y+h*0.62} l -3 6 l 3 -2 l 3 2 z" fill="#fff"/>
    <rect x="${x+2}" y="${y+2}" width="14" height="6" fill="#000" opacity="0.5"/>
    <text x="${x+4}" y="${y+6.4}" font-size="3" fill="#0ce0c0" font-family="sans-serif">MAP</text>
  </g>`;
}

function g3xBezel(w, h, knobR) {
  const sx = -w / 2, sy = -h / 2;
  const m = Math.max(3, w * 0.018); // bezel margin
  const screenX = sx + m, screenY = sy + m;
  const screenW = w - 2 * m, screenH = h - 2 * m - knobR * 2.4;
  const knobY = sy + h - knobR - m * 0.6;
  return { sx, sy, m, screenX, screenY, screenW, screenH, knobY };
}

function gdu460() {
  const w = 275.5, h = 198.6;
  const b = g3xBezel(w, h, 9);
  // landscape: PFD left half, map right half
  const gap = 1;
  const halfW = (b.screenW - gap) / 2;
  return `
    <rect class="sel-outline" x="${b.sx}" y="${b.sy}" width="${w}" height="${h}" rx="6"/>
    <rect x="${b.sx}" y="${b.sy}" width="${w}" height="${h}" rx="7" fill="#16181c" stroke="#000" stroke-width="0.8"/>
    <rect x="${b.screenX}" y="${b.screenY}" width="${b.screenW}" height="${b.screenH}" fill="#05070a"/>
    ${pfd(b.screenX, b.screenY, halfW, b.screenH)}
    ${mfdMap(b.screenX + halfW + gap, b.screenY, halfW, b.screenH)}
    <circle cx="${b.sx + 18}" cy="${b.knobY}" r="9" fill="#0c0c0d" stroke="#33363c" stroke-width="0.8"/>
    <circle cx="${b.sx + 18}" cy="${b.knobY}" r="5" fill="#1a1b1e" stroke="#33363c" stroke-width="0.6"/>
    <circle cx="${b.sx + w - 18}" cy="${b.knobY}" r="9" fill="#0c0c0d" stroke="#33363c" stroke-width="0.8"/>
    <circle cx="${b.sx + w - 18}" cy="${b.knobY}" r="5" fill="#1a1b1e" stroke="#33363c" stroke-width="0.6"/>
    <text x="${b.sx + w/2}" y="${b.knobY + 3}" text-anchor="middle" font-size="6" fill="#3a3d44" font-family="sans-serif" letter-spacing="1">GARMIN</text>
  `;
}

function gdu470() {
  const w = 152.7, h = 198.6;
  const b = g3xBezel(w, h, 8);
  // portrait: PFD top ~58%, map bottom
  const gap = 1;
  const topH = b.screenH * 0.58;
  const botH = b.screenH - topH - gap;
  return `
    <rect class="sel-outline" x="${b.sx}" y="${b.sy}" width="${w}" height="${h}" rx="6"/>
    <rect x="${b.sx}" y="${b.sy}" width="${w}" height="${h}" rx="7" fill="#16181c" stroke="#000" stroke-width="0.8"/>
    <rect x="${b.screenX}" y="${b.screenY}" width="${b.screenW}" height="${b.screenH}" fill="#05070a"/>
    ${pfd(b.screenX, b.screenY, b.screenW, topH)}
    ${mfdMap(b.screenX, b.screenY + topH + gap, b.screenW, botH)}
    <circle cx="${b.sx + 15}" cy="${b.knobY}" r="8" fill="#0c0c0d" stroke="#33363c" stroke-width="0.8"/>
    <circle cx="${b.sx + 15}" cy="${b.knobY}" r="4.5" fill="#1a1b1e" stroke="#33363c" stroke-width="0.6"/>
    <circle cx="${b.sx + w - 15}" cy="${b.knobY}" r="8" fill="#0c0c0d" stroke="#33363c" stroke-width="0.8"/>
    <circle cx="${b.sx + w - 15}" cy="${b.knobY}" r="4.5" fill="#1a1b1e" stroke="#33363c" stroke-width="0.6"/>
    <text x="${b.sx + w/2}" y="${b.knobY + 3}" text-anchor="middle" font-size="5" fill="#3a3d44" font-family="sans-serif" letter-spacing="1">GARMIN</text>
  `;
}

// Same 7" module as the GDU 470, rotated to landscape.
function gdu450() {
  const w = 198.6, h = 152.7;
  const b = g3xBezel(w, h, 8);
  // landscape: PFD left half, map right half
  const gap = 1;
  const halfW = (b.screenW - gap) / 2;
  return `
    <rect class="sel-outline" x="${b.sx}" y="${b.sy}" width="${w}" height="${h}" rx="6"/>
    <rect x="${b.sx}" y="${b.sy}" width="${w}" height="${h}" rx="7" fill="#16181c" stroke="#000" stroke-width="0.8"/>
    <rect x="${b.screenX}" y="${b.screenY}" width="${b.screenW}" height="${b.screenH}" fill="#05070a"/>
    ${pfd(b.screenX, b.screenY, halfW, b.screenH)}
    ${mfdMap(b.screenX + halfW + gap, b.screenY, halfW, b.screenH)}
    <circle cx="${b.sx + 15}" cy="${b.knobY}" r="8" fill="#0c0c0d" stroke="#33363c" stroke-width="0.8"/>
    <circle cx="${b.sx + 15}" cy="${b.knobY}" r="4.5" fill="#1a1b1e" stroke="#33363c" stroke-width="0.6"/>
    <circle cx="${b.sx + w - 15}" cy="${b.knobY}" r="8" fill="#0c0c0d" stroke="#33363c" stroke-width="0.8"/>
    <circle cx="${b.sx + w - 15}" cy="${b.knobY}" r="4.5" fill="#1a1b1e" stroke="#33363c" stroke-width="0.6"/>
    <text x="${b.sx + w/2}" y="${b.knobY + 3}" text-anchor="middle" font-size="5" fill="#3a3d44" font-family="sans-serif" letter-spacing="1">GARMIN</text>
  `;
}

/* -------------------------------------------------------------------------- */

const CATALOG = [
  { id: 'ai',  name: 'Attitude Indicator', category: '3⅛″ Round', w: ROUND_BEZEL, h: ROUND_BEZEL, svg: attitude },
  { id: 'dg',  name: 'Directional Gyro',   category: '3⅛″ Round', w: ROUND_BEZEL, h: ROUND_BEZEL, svg: dg },
  { id: 'asi', name: 'Airspeed',           category: '3⅛″ Round', w: ROUND_BEZEL, h: ROUND_BEZEL, svg: airspeed },
  { id: 'alt', name: 'Altimeter',          category: '3⅛″ Round', w: ROUND_BEZEL, h: ROUND_BEZEL, svg: altimeter },
  { id: 'vsi', name: 'Vertical Speed',     category: '3⅛″ Round', w: ROUND_BEZEL, h: ROUND_BEZEL, svg: vsi },
  { id: 'tc',  name: 'Turn Coordinator',   category: '3⅛″ Round', w: ROUND_BEZEL, h: ROUND_BEZEL, svg: turn },
  { id: 'gdu460', name: 'G3X Touch — GDU 460 (10″)',          category: 'Garmin Glass', w: 275.5, h: 198.6, svg: gdu460 },
  { id: 'gdu450', name: 'G3X Touch — GDU 450 (7″ landscape)', category: 'Garmin Glass', w: 198.6, h: 152.7, svg: gdu450 },
  { id: 'gdu470', name: 'G3X Touch — GDU 470 (7″ portrait)',  category: 'Garmin Glass', w: 152.7, h: 198.6, svg: gdu470 },
];

const CATALOG_BY_ID = Object.fromEntries(CATALOG.map(i => [i.id, i]));

// Wrap an instrument's inner markup in a standalone <svg> for palette thumbnails.
function thumbSVG(inst) {
  const pad = inst.w * 0.06 + 4;
  const w = inst.w + pad * 2, h = inst.h + pad * 2;
  return `<svg viewBox="${-w/2} ${-h/2} ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${inst.svg()}</svg>`;
}

APP.CATALOG = CATALOG;
APP.CATALOG_BY_ID = CATALOG_BY_ID;
APP.thumbSVG = thumbSVG;
})();
