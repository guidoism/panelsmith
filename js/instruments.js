// Instrument catalog. Every instrument is drawn in REAL MILLIMETRES, centered on
// the origin (0,0), so it drops onto the mm-scaled panel stage at true size.
//
// Each entry: { id, name, category, w, h, svg() }  — svg() returns the inner
// markup of a <g>, spanning -w/2..w/2 (x) and -h/2..h/2 (y).

(function () {
const IN = 25.4; // mm per inch

let _idSeq = 0;
const nextId = () => 'u' + (++_idSeq);

// Polar helper: angle in degrees, CLOCKWISE from 12 o'clock. Returns [x, y].
function pol(r, deg) {
  const a = deg * Math.PI / 180;
  return [+(r * Math.sin(a)).toFixed(3), +(-r * Math.cos(a)).toFixed(3)];
}
// Arc path between two angles (clockwise, deg1 > deg0).
function arc(r, d0, d1) {
  const [x0, y0] = pol(r, d0), [x1, y1] = pol(r, d1);
  const large = (d1 - d0) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ----------------------------------------------------------------------------
 * Shared gradient / filter defs — injected once into the stage and into each
 * palette thumbnail so instruments can reference them by id.
 * -------------------------------------------------------------------------- */
const DEFS = `
<radialGradient id="bezelFace" cx="50%" cy="38%" r="75%">
  <stop offset="0%" stop-color="#43464c"/>
  <stop offset="62%" stop-color="#2b2e33"/>
  <stop offset="100%" stop-color="#141517"/>
</radialGradient>
<radialGradient id="dialFace" cx="50%" cy="40%" r="78%">
  <stop offset="0%" stop-color="#1c1d20"/>
  <stop offset="78%" stop-color="#0c0c0e"/>
  <stop offset="100%" stop-color="#050506"/>
</radialGradient>
<radialGradient id="glassGloss" cx="36%" cy="26%" r="85%">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12"/>
  <stop offset="42%" stop-color="#ffffff" stop-opacity="0.02"/>
  <stop offset="100%" stop-color="#000000" stop-opacity="0.22"/>
</radialGradient>
<radialGradient id="skyGrad" cx="50%" cy="22%" r="95%">
  <stop offset="0%" stop-color="#63c9f2"/><stop offset="100%" stop-color="#1d7ec4"/>
</radialGradient>
<linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#9c6a36"/><stop offset="100%" stop-color="#5b3a1b"/>
</linearGradient>
<radialGradient id="knobGrad" cx="50%" cy="34%" r="72%">
  <stop offset="0%" stop-color="#52555b"/><stop offset="100%" stop-color="#191a1c"/>
</radialGradient>
`;

/* ----------------------------------------------------------------------------
 * Shared bezel: dark cast housing, four corner screws, recessed round dial.
 * Matches the look of real 3⅛" panel instruments.
 * -------------------------------------------------------------------------- */
const BZ = 84;          // square bezel, mm
const DIAL_R = 38;      // dial face radius
const CLIP_R = 36.5;    // content clip radius

function screw(x, y) {
  const a = (x + y) % 90; // vary slot orientation a little
  return `<g transform="translate(${x} ${y}) rotate(${a})">
    <circle r="3.2" fill="#1a1b1d"/>
    <circle r="2.7" fill="url(#knobGrad)" stroke="#0c0d0e" stroke-width="0.3"/>
    <path d="M -1.8 0 H 1.8 M 0 -1.8 V 1.8" stroke="#0b0c0d" stroke-width="0.55"/>
  </g>`;
}

function bezel(extra = '') {
  const o = 34;
  return `
    <rect class="sel-outline" x="${-BZ/2}" y="${-BZ/2}" width="${BZ}" height="${BZ}" rx="6"/>
    <rect x="${-BZ/2}" y="${-BZ/2}" width="${BZ}" height="${BZ}" rx="7" fill="url(#bezelFace)" stroke="#070708" stroke-width="0.8"/>
    <rect x="${-BZ/2+1}" y="${-BZ/2+1}" width="${BZ-2}" height="${BZ-2}" rx="6" fill="none" stroke="#5b5f66" stroke-width="0.4" opacity="0.45"/>
    ${screw(-o,-o)}${screw(o,-o)}${screw(-o,o)}${screw(o,o)}
    <circle r="${DIAL_R+1.5}" fill="#0a0a0b"/>
    <circle r="${DIAL_R}" fill="url(#dialFace)" stroke="#000" stroke-width="0.5"/>
    ${extra}
  `;
}

// Glass reflection + thin inner ring, drawn on TOP of dial content.
function glass() {
  return `<circle r="${DIAL_R}" fill="url(#glassGloss)" stroke="#3a3d44" stroke-width="0.5" pointer-events="none"/>`;
}

function hub(r = 2.4) {
  return `<circle r="${r}" fill="#d7dce1"/><circle r="${r*0.45}" fill="#3a3d42"/>`;
}

function title(text, y, size = 4.6) {
  return `<text x="0" y="${y}" text-anchor="middle" font-size="${size}" fill="#8d959d" font-family="Helvetica, Arial, sans-serif" letter-spacing="0.4">${text}</text>`;
}

function dialClip(inner) {
  const id = nextId();
  return `<clipPath id="${id}"><circle r="${CLIP_R}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
}

/* ----------------------------------------------------------------------------
 * Attitude indicator
 * -------------------------------------------------------------------------- */
function attitude() {
  const pitch = 0.62; // mm per degree
  const ladder = [];
  for (const p of [20, 10, -10, -20]) {
    const y = -p * pitch, half = p % 20 === 0 ? 9 : 5;
    ladder.push(`<line x1="${-half}" y1="${y}" x2="${half}" y2="${y}" stroke="#fff" stroke-width="0.6"/>`);
    if (p % 20 === 0) {
      ladder.push(`<text x="${-half-2.5}" y="${y+1.4}" text-anchor="end" font-size="3.6" fill="#fff" font-family="Arial">${Math.abs(p)}</text>`);
      ladder.push(`<text x="${half+2.5}" y="${y+1.4}" font-size="3.6" fill="#fff" font-family="Arial">${Math.abs(p)}</text>`);
    }
  }
  // bank scale ticks around the top
  const bankTicks = [-60,-45,-30,-20,-10,10,20,30,45,60].map(b => {
    const big = Math.abs(b) % 30 === 0 || Math.abs(b) === 60;
    const r1 = 34, r2 = big ? 30 : 32;
    const [x1,y1] = pol(r1, b), [x2,y2] = pol(r2, b);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="${big?0.8:0.5}"/>`;
  }).join('');

  const dial = dialClip(`
    <rect x="-40" y="-40" width="80" height="40" fill="url(#skyGrad)"/>
    <rect x="-40" y="0" width="80" height="40" fill="url(#groundGrad)"/>
    <rect x="-40" y="-0.7" width="80" height="1.4" fill="#f1f4f6"/>
    ${ladder.join('')}
  `);

  return `<g>
    ${bezel()}
    ${dial}
    ${bankTicks}
    <path d="M 0 ${-CLIP_R+1} l -2.6 4.4 l 5.2 0 z" fill="#ffd23a" stroke="#a37b00" stroke-width="0.3"/>
    <!-- fixed yellow aircraft symbol -->
    <g fill="#ffd23a" stroke="#7a5b00" stroke-width="0.25">
      <path d="M -19 0 h 7 v 2.2 h -2.4 v -1 h -4.6 z"/>
      <path d="M 19 0 h -7 v 2.2 h 2.4 v -1 h 4.6 z"/>
      <path d="M -3.4 0 h 6.8 l -1.6 3.4 h -3.6 z"/>
    </g>
    <circle r="1.1" fill="#ffd23a"/>
    <!-- OFF flag -->
    <g transform="translate(20 -16)">
      <rect x="-4.5" y="-3" width="9" height="6" rx="0.8" fill="#c62828" stroke="#7a1414" stroke-width="0.3"/>
      <text x="0" y="1.6" text-anchor="middle" font-size="3.6" fill="#fff" font-family="Arial" font-weight="bold">OFF</text>
    </g>
    ${glass()}
    <!-- adjustment knob, bottom centre on bezel -->
    <g transform="translate(0 ${BZ/2-4})">
      <rect x="-6" y="-2.4" width="12" height="4.8" rx="2" fill="#111"/>
      <circle cx="0" cy="0" r="3.4" fill="url(#knobGrad)" stroke="#0a0a0b" stroke-width="0.4"/>
    </g>
    ${title('PULL TO CAGE', BZ/2-9, 2.6)}
  </g>`;
}

/* ----------------------------------------------------------------------------
 * Airspeed indicator — colour arcs driven by the design's V-speeds (see ASI).
 * -------------------------------------------------------------------------- */
const ASI_PRESETS = {
  mph: { unit: 'MPH', scaleMin: 40, scaleMax: 240, step: 20, minor: 10,
         vs0: 58, vfe: 100, vs1: 64, vno: 142, vne: 230 },
  kt:  { unit: 'KNOTS', scaleMin: 40, scaleMax: 220, step: 20, minor: 10,
         vs0: 53, vfe: 87, vs1: 56, vno: 123, vne: 200 },
};
let ASI = { ...ASI_PRESETS.mph };
function setASIConfig(cfg) { if (cfg) ASI = { ...ASI, ...cfg }; }

const ASI_A0 = 32, ASI_SWEEP = 296;   // gauge sweep, deg clockwise from top
function asiAng(v) {
  const t = (clamp(v, ASI.scaleMin, ASI.scaleMax) - ASI.scaleMin) / (ASI.scaleMax - ASI.scaleMin);
  return ASI_A0 + t * ASI_SWEEP;
}

function airspeed() {
  const ticks = [], nums = [];
  for (let v = ASI.scaleMin; v <= ASI.scaleMax + 0.1; v += ASI.minor) {
    const major = (v - ASI.scaleMin) % ASI.step === 0;
    const a = asiAng(v);
    const [x1, y1] = pol(37, a), [x2, y2] = pol(major ? 31.5 : 34, a);
    ticks.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#e9edf0" stroke-width="${major?0.9:0.5}"/>`);
    if (major) {
      const [nx, ny] = pol(26.5, a);
      nums.push(`<text x="${nx}" y="${ny+2}" text-anchor="middle" font-size="5.4" fill="#fff" font-family="Arial" font-weight="bold">${v}</text>`);
    }
  }
  const band = (r, v0, v1, color, w) =>
    `<path d="${arc(r, asiAng(v0), asiAng(v1))}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
  const [rx0, ry0] = pol(31.5, asiAng(ASI.vne)), [rx1, ry1] = pol(37.5, asiAng(ASI.vne));

  return `<g>
    ${bezel()}
    ${band(29, ASI.vs0, ASI.vfe, '#f3f4f6', 1.8)}
    ${band(34.5, ASI.vs1, ASI.vno, '#1faa4b', 2.6)}
    ${band(34.5, ASI.vno, ASI.vne, '#f2c200', 2.6)}
    <line x1="${rx0}" y1="${ry0}" x2="${rx1}" y2="${ry1}" stroke="#e02424" stroke-width="1.6"/>
    ${ticks.join('')}
    ${nums.join('')}
    ${title('AIRSPEED', -13, 4.4)}
    ${title(ASI.unit, 17, 4)}
    <!-- needle pointing up (at rest, into the top gap) -->
    <g>
      <path d="M -1.2 3 L -0.5 ${-31} L 0.5 ${-31} L 1.2 3 Z" fill="#f4f6f8" stroke="#9aa0a6" stroke-width="0.2"/>
      <path d="M -1.6 3 L 1.6 3 L 1 7 L -1 7 Z" fill="#f4f6f8"/>
    </g>
    ${hub(2.6)}
    ${glass()}
  </g>`;
}

/* ----------------------------------------------------------------------------
 * Altimeter (three-pointer)
 * -------------------------------------------------------------------------- */
function altimeter() {
  const ticks = [], nums = [];
  for (let i = 0; i < 50; i++) {
    const a = i * 7.2, major = i % 5 === 0;
    const [x1, y1] = pol(37, a), [x2, y2] = pol(major ? 31 : 34.5, a);
    ticks.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="${major?0.9:0.45}"/>`);
    if (major) {
      const [nx, ny] = pol(25.5, a);
      nums.push(`<text x="${nx}" y="${ny+2.2}" text-anchor="middle" font-size="6" fill="#fff" font-family="Arial" font-weight="bold">${i/5}</text>`);
    }
  }
  return `<g>
    ${bezel()}
    ${ticks.join('')}
    ${nums.join('')}
    ${title('ALT', -14, 4)}
    ${title('1000 FEET', 12, 3)}
    ${title('CALIBRATED TO', 16.5, 2.4)}
    ${title('20,000 FEET', 19.5, 2.4)}
    <!-- Kollsman window -->
    <g transform="translate(24 0)">
      <rect x="-7" y="-3.2" width="14" height="6.4" rx="0.8" fill="#0c0c0e" stroke="#5a5d63" stroke-width="0.4"/>
      <text x="0" y="2" text-anchor="middle" font-size="4" fill="#e9edf0" font-family="Arial">29.92</text>
    </g>
    <!-- 10000 ft pointer (thin, triangle tip) -->
    <g transform="rotate(0)">
      <path d="M 0 4 L 0 -33 L -1.6 -29 L 0 -33 L 1.6 -29" fill="none" stroke="#cdd2d7" stroke-width="0.7"/>
    </g>
    <!-- 1000 ft pointer (short, fat) -->
    <g transform="rotate(108)">
      <path d="M -2 2 L -1.4 -19 L 0 -22 L 1.4 -19 L 2 2 Z" fill="#e9edf0"/>
    </g>
    <!-- 100 ft pointer (long, slender) -->
    <g transform="rotate(36)">
      <path d="M -1.2 5 L -0.5 -32 L 0.5 -32 L 1.2 5 Z" fill="#f4f6f8"/>
      <path d="M -1.6 5 L 1.6 5 L 1 8.5 L -1 8.5 Z" fill="#f4f6f8"/>
    </g>
    ${hub(2.6)}
    ${glass()}
  </g>`;
}

/* ----------------------------------------------------------------------------
 * Directional gyro / heading indicator
 * -------------------------------------------------------------------------- */
function dg() {
  const ticks = [], labels = [];
  const cardinals = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
  for (let h = 0; h < 360; h += 5) {
    const major = h % 10 === 0, big = h % 30 === 0;
    const [x1, y1] = pol(37, h), [x2, y2] = pol(big ? 31 : major ? 33 : 34.5, h);
    ticks.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="${big?0.9:0.5}"/>`);
    if (big) {
      const [tx, ty] = pol(26, h);
      const lab = cardinals[h] ?? (h / 10);
      const size = cardinals[h] ? 6 : 4.6;
      labels.push(`<g transform="translate(${tx} ${ty}) rotate(${h})"><text y="2" text-anchor="middle" font-size="${size}" fill="${cardinals[h]?'#ffd23a':'#fff'}" font-family="Arial" font-weight="bold">${lab}</text></g>`);
    }
  }
  return `<g>
    ${bezel()}
    ${ticks.join('')}
    ${labels.join('')}
    <!-- lubber line + heading bug at top -->
    <path d="M 0 ${-CLIP_R+1} l -2 3.6 l 4 0 z" fill="#ffd23a"/>
    <!-- fixed airplane symbol -->
    <g fill="#f0f3f6" stroke="#9aa0a6" stroke-width="0.2">
      <rect x="-1.1" y="-15" width="2.2" height="30" rx="1"/>
      <rect x="-13" y="-1.2" width="26" height="2.4" rx="1"/>
      <rect x="-6" y="11" width="12" height="2.2" rx="1"/>
    </g>
    ${hub(2)}
    ${glass()}
    ${title('HDG', 20, 3.4)}
  </g>`;
}

/* ----------------------------------------------------------------------------
 * Vertical speed indicator
 * -------------------------------------------------------------------------- */
function vsi() {
  // 0 at 9 o'clock (270°). Climb sweeps up to +20 at top, descend down to -20.
  const ang = (v) => 270 + v * (160 / 20); // ±20 (×100 ft/min) -> ±160°
  const ticks = [], nums = [];
  for (let v = -20; v <= 20; v += 1) {
    const major = v % 5 === 0;
    const a = ang(v);
    const [x1, y1] = pol(37, a), [x2, y2] = pol(major ? 31.5 : 34, a);
    ticks.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="${major?0.9:0.45}"/>`);
    if (major && v % 10 === 0) {
      const [nx, ny] = pol(26, a);
      nums.push(`<text x="${nx}" y="${ny+2}" text-anchor="middle" font-size="5.4" fill="#fff" font-family="Arial" font-weight="bold">${Math.abs(v/10)}</text>`);
    }
  }
  return `<g>
    ${bezel()}
    ${ticks.join('')}
    ${nums.join('')}
    ${title('UP', -19, 3.2)}
    ${title('DOWN', 22, 3.2)}
    ${title('VERTICAL SPEED', 12, 3)}
    ${title('100 FT / MIN', 15.5, 2.6)}
    <g transform="rotate(${ang(0)})">
      <path d="M -1 2 L -0.5 -32 L 0.5 -32 L 1 2 Z" fill="#f4f6f8"/>
    </g>
    ${hub(2.2)}
    ${glass()}
  </g>`;
}

/* ----------------------------------------------------------------------------
 * Turn coordinator (with inclinometer)
 * -------------------------------------------------------------------------- */
function turn() {
  return `<g>
    ${bezel()}
    <!-- bank reference marks -->
    ${[-30,-20,-10,10,20,30].map(b => {
      const [x1,y1] = pol(37, b-90), [x2,y2] = pol(33, b-90);
      const [x3,y3] = pol(37, 90-b), [x4,y4] = pol(33, 90-b);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="0.7"/>
              <line x1="${x3}" y1="${y3}" x2="${x4}" y2="${y4}" stroke="#fff" stroke-width="0.7"/>`;
    }).join('')}
    <text x="-26" y="-6" text-anchor="middle" font-size="4.4" fill="#fff" font-family="Arial">L</text>
    <text x="26" y="-6" text-anchor="middle" font-size="4.4" fill="#fff" font-family="Arial">R</text>
    <!-- miniature airplane (wings level) -->
    <g fill="#f0f3f6" stroke="#9aa0a6" stroke-width="0.2">
      <rect x="-20" y="-1" width="40" height="2" rx="1"/>
      <circle r="2.4"/>
      <rect x="-1" y="-7" width="2" height="6" rx="1"/>
    </g>
    <!-- inclinometer -->
    <g transform="translate(0 22)">
      <path d="M -11 0 a 11 5 0 0 0 22 0" fill="#0c0c0e" stroke="#4a4d52" stroke-width="0.4"/>
      <line x1="-2.6" y1="-1" x2="-2.6" y2="3" stroke="#cfd4d9" stroke-width="0.5"/>
      <line x1="2.6" y1="-1" x2="2.6" y2="3" stroke="#cfd4d9" stroke-width="0.5"/>
      <circle cx="0" cy="1.6" r="2.3" fill="#111" stroke="#333" stroke-width="0.3"/>
    </g>
    ${title('2 MIN', -15, 3.2)}
    ${title('NO PITCH INFORMATION', 12, 2.6)}
    ${glass()}
  </g>`;
}

/* ----------------------------------------------------------------------------
 * Garmin G3X Touch glass displays (faithful PFD/MFD layout, pure SVG)
 * -------------------------------------------------------------------------- */
function pfd(x, y, w, h) {
  const cx = x + w / 2, cy = y + h / 2;
  const tapeW = Math.min(13, w * 0.16);
  const id = nextId();
  return `
  <clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>
  <g clip-path="url(#${id})">
    <rect x="${x}" y="${y}" width="${w}" height="${h/2}" fill="#2b7fc9"/>
    <rect x="${x}" y="${cy}" width="${w}" height="${h/2}" fill="#6e4a28"/>
    <rect x="${x}" y="${cy-0.5}" width="${w}" height="1" fill="#fff"/>
    <g stroke="#fff" stroke-width="0.5" opacity="0.9">
      <line x1="${cx-9}" y1="${cy-h*0.18}" x2="${cx+9}" y2="${cy-h*0.18}"/>
      <line x1="${cx-5}" y1="${cy-h*0.09}" x2="${cx+5}" y2="${cy-h*0.09}"/>
      <line x1="${cx-5}" y1="${cy+h*0.09}" x2="${cx+5}" y2="${cy+h*0.09}"/>
      <line x1="${cx-9}" y1="${cy+h*0.18}" x2="${cx+9}" y2="${cy+h*0.18}"/>
    </g>
    <path d="M ${cx-w*0.3} ${y+h*0.16} A ${w*0.34} ${w*0.34} 0 0 1 ${cx+w*0.3} ${y+h*0.16}" fill="none" stroke="#fff" stroke-width="0.5"/>
    <path d="M ${cx} ${y+h*0.05} l -2.2 4 l 4.4 0 z" fill="#ffb000"/>
    <path d="M ${cx-13} ${cy} l 6 0 m 14 0 l 6 0" stroke="#ffb000" stroke-width="1.4"/>
    <rect x="${cx-1}" y="${cy-1}" width="2" height="2" fill="#ffb000"/>
    <rect x="${x}" y="${y}" width="${tapeW}" height="${h}" fill="#000" opacity="0.55"/>
    <rect x="${x+1}" y="${cy-4}" width="${tapeW-2}" height="8" fill="#11161c" stroke="#fff" stroke-width="0.4"/>
    <text x="${x+tapeW/2}" y="${cy+1.5}" text-anchor="middle" font-size="3.4" fill="#fff" font-family="sans-serif">120</text>
    <rect x="${x+w-tapeW}" y="${y}" width="${tapeW}" height="${h}" fill="#000" opacity="0.55"/>
    <rect x="${x+w-tapeW+1}" y="${cy-4}" width="${tapeW-2}" height="8" fill="#11161c" stroke="#fff" stroke-width="0.4"/>
    <text x="${x+w-tapeW/2}" y="${cy+1.5}" text-anchor="middle" font-size="3.2" fill="#fff" font-family="sans-serif">3500</text>
    <circle cx="${cx}" cy="${y+h-h*0.17}" r="${h*0.13}" fill="#0c1118" stroke="#fff" stroke-width="0.4" opacity="0.92"/>
    <path d="M ${cx} ${y+h-h*0.17-h*0.11} l -2 5 l 4 0 z" fill="#ffb000"/>
    <text x="${cx}" y="${y+h-h*0.17-h*0.135}" text-anchor="middle" font-size="3" fill="#0ad06a" font-family="sans-serif">N</text>
  </g>`;
}

function mfdMap(x, y, w, h) {
  const id = nextId();
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
  const m = Math.max(3, w * 0.018);
  const screenX = sx + m, screenY = sy + m;
  const screenW = w - 2 * m, screenH = h - 2 * m - knobR * 2.4;
  const knobY = sy + h - knobR - m * 0.6;
  return { sx, sy, m, screenX, screenY, screenW, screenH, knobY };
}

function gduLandscape(w, h, knobR, fs) {
  const b = g3xBezel(w, h, knobR), gap = 1, halfW = (b.screenW - gap) / 2;
  const kx = Math.round(w * 0.066);
  return `
    <rect class="sel-outline" x="${b.sx}" y="${b.sy}" width="${w}" height="${h}" rx="6"/>
    <rect x="${b.sx}" y="${b.sy}" width="${w}" height="${h}" rx="7" fill="#16181c" stroke="#000" stroke-width="0.8"/>
    <rect x="${b.screenX}" y="${b.screenY}" width="${b.screenW}" height="${b.screenH}" fill="#05070a"/>
    ${pfd(b.screenX, b.screenY, halfW, b.screenH)}
    ${mfdMap(b.screenX + halfW + gap, b.screenY, halfW, b.screenH)}
    <circle cx="${b.sx + kx}" cy="${b.knobY}" r="${knobR}" fill="#0c0c0d" stroke="#33363c" stroke-width="0.8"/>
    <circle cx="${b.sx + kx}" cy="${b.knobY}" r="${knobR*0.55}" fill="#1a1b1e" stroke="#33363c" stroke-width="0.6"/>
    <circle cx="${b.sx + w - kx}" cy="${b.knobY}" r="${knobR}" fill="#0c0c0d" stroke="#33363c" stroke-width="0.8"/>
    <circle cx="${b.sx + w - kx}" cy="${b.knobY}" r="${knobR*0.55}" fill="#1a1b1e" stroke="#33363c" stroke-width="0.6"/>
    <text x="${b.sx + w/2}" y="${b.knobY + 3}" text-anchor="middle" font-size="${fs}" fill="#3a3d44" font-family="sans-serif" letter-spacing="1">GARMIN</text>
  `;
}

const gdu460 = () => gduLandscape(275.5, 198.6, 9, 6);
const gdu450 = () => gduLandscape(198.6, 152.7, 8, 5);

function gdu470() {
  const w = 152.7, h = 198.6, b = g3xBezel(w, h, 8), gap = 1;
  const topH = b.screenH * 0.58, botH = b.screenH - topH - gap;
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

/* -------------------------------------------------------------------------- */

const CATALOG = [
  { id: 'ai',  name: 'Attitude Indicator', category: '3⅛″ Round', w: BZ, h: BZ, svg: attitude },
  { id: 'dg',  name: 'Directional Gyro',   category: '3⅛″ Round', w: BZ, h: BZ, svg: dg },
  { id: 'asi', name: 'Airspeed',           category: '3⅛″ Round', w: BZ, h: BZ, svg: airspeed },
  { id: 'alt', name: 'Altimeter',          category: '3⅛″ Round', w: BZ, h: BZ, svg: altimeter },
  { id: 'vsi', name: 'Vertical Speed',     category: '3⅛″ Round', w: BZ, h: BZ, svg: vsi },
  { id: 'tc',  name: 'Turn Coordinator',   category: '3⅛″ Round', w: BZ, h: BZ, svg: turn },
  { id: 'gdu460', name: 'G3X Touch — GDU 460 (10″)',          category: 'Garmin Glass', w: 275.5, h: 198.6, svg: gdu460 },
  { id: 'gdu450', name: 'G3X Touch — GDU 450 (7″ landscape)', category: 'Garmin Glass', w: 198.6, h: 152.7, svg: gdu450 },
  { id: 'gdu470', name: 'G3X Touch — GDU 470 (7″ portrait)',  category: 'Garmin Glass', w: 152.7, h: 198.6, svg: gdu470 },
];

const CATALOG_BY_ID = Object.fromEntries(CATALOG.map(i => [i.id, i]));

// Wrap an instrument's inner markup in a standalone <svg> for palette thumbnails.
function thumbSVG(inst) {
  const pad = inst.w * 0.06 + 4;
  const w = inst.w + pad * 2, h = inst.h + pad * 2;
  return `<svg viewBox="${-w/2} ${-h/2} ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><defs>${DEFS}</defs>${inst.svg()}</svg>`;
}

APP.CATALOG = CATALOG;
APP.CATALOG_BY_ID = CATALOG_BY_ID;
APP.thumbSVG = thumbSVG;
APP.INSTRUMENT_DEFS = DEFS;
APP.ASI_PRESETS = ASI_PRESETS;
APP.setASIConfig = setASIConfig;
})();
