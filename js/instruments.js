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

function bezel(extra = '', size = BZ) {
  const s = size / 2, dr = size / 2 - 4, o = size / 2 - 8;
  return `
    <rect class="sel-outline" x="${-s}" y="${-s}" width="${size}" height="${size}" rx="6"/>
    <rect x="${-s}" y="${-s}" width="${size}" height="${size}" rx="7" fill="url(#bezelFace)" stroke="#070708" stroke-width="0.8"/>
    <rect x="${-s+1}" y="${-s+1}" width="${size-2}" height="${size-2}" rx="6" fill="none" stroke="#5b5f66" stroke-width="0.4" opacity="0.45"/>
    ${screw(-o,-o)}${screw(o,-o)}${screw(-o,o)}${screw(o,o)}
    <circle r="${dr+1.5}" fill="#0a0a0b"/>
    <circle r="${dr}" fill="url(#dialFace)" stroke="#000" stroke-width="0.5"/>
    ${extra}
  `;
}

// Glass reflection + thin inner ring, drawn on TOP of dial content.
function glass(size = BZ) {
  const dr = size / 2 - 4;
  return `<circle r="${dr}" fill="url(#glassGloss)" stroke="#3a3d44" stroke-width="0.5" pointer-events="none"/>`;
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
 * AoA / Lift indicators — three different styles.
 * -------------------------------------------------------------------------- */

// 1) Lift Reserve Indicator — 2¼" round, analog needle over a colour arc.
function lri() {
  const SZ = 57, r = 20;
  const seg = (d0, d1, c) => `<path d="${arc(r, d0, d1)}" fill="none" stroke="${c}" stroke-width="4.5" stroke-linecap="butt"/>`;
  const ticks = [-78,-55,-26,8,40,78].map(d => {
    const [x1,y1] = pol(r+3.5, d), [x2,y2] = pol(r-3.5, d);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0a0a0b" stroke-width="0.7"/>`;
  }).join('');
  return `<g>
    ${bezel('', SZ)}
    ${seg(-78,-40,'#e02424')}
    ${seg(-40,-12,'#f2c200')}
    ${seg(-12,40,'#1faa4b')}
    ${seg(40,78,'#2f7fc4')}
    ${ticks}
    <text x="0" y="-2.5" text-anchor="middle" font-size="3.6" fill="#9aa0a6" font-family="Arial">LIFT</text>
    <text x="0" y="2.2" text-anchor="middle" font-size="2.7" fill="#6b7178" font-family="Arial">RESERVE</text>
    <g><path d="M -1 3 L -0.4 ${-(r+1)} L 0.4 ${-(r+1)} L 1 3 Z" fill="#f4f6f8"/></g>
    ${hub(1.8)}
    ${glass(SZ)}
  </g>`;
}

function aoaHousing(w, h, inner) {
  return `<g>
    <rect class="sel-outline" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="3"/>
    <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="4" fill="#101113" stroke="#000" stroke-width="0.8"/>
    <rect x="${-w/2+1.6}" y="${-h/2+1.6}" width="${w-3.2}" height="${h-3.2}" rx="3" fill="#060708" stroke="#26282c" stroke-width="0.4"/>
    ${inner}
    <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="4" fill="url(#glassGloss)" pointer-events="none"/>
  </g>`;
}

// 2) Alpha Systems "Eagle" — chevron + donut display.
function aoaEagle() {
  const w = 38, h = 66;
  const chev = (cy, color, dir, lit) =>
    `<path d="M -9 ${cy+3.2*dir} L 0 ${cy-3.2*dir} L 9 ${cy+3.2*dir}" fill="none" stroke="${color}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity="${lit?1:0.3}"/>`;
  return aoaHousing(w, h, `
    ${chev(-22,'#e02424',1,true)}
    ${chev(-11,'#f2c200',1,false)}
    <circle cx="0" cy="2" r="5.2" fill="none" stroke="#1faa4b" stroke-width="3" opacity="0.85"/>
    ${chev(16,'#2f7fc4',-1,false)}
    ${chev(25,'#2f7fc4',-1,false)}
    <text x="0" y="${h/2-3}" text-anchor="middle" font-size="3" fill="#5a5d63" font-family="Arial" letter-spacing="0.5">AOA</text>
  `);
}

// 3) Dynon / Garmin style LED ladder — colour bands + pointer.
function aoaLadder() {
  const w = 32, h = 64, bx = 3, bw = 9, top = -25;
  return aoaHousing(w, h, `
    <rect x="${bx}" y="${top}" width="${bw}" height="11" fill="#e02424"/>
    <rect x="${bx}" y="${top+11}" width="${bw}" height="9" fill="#f2c200"/>
    <rect x="${bx}" y="${top+20}" width="${bw}" height="19" fill="#1faa4b"/>
    <rect x="${bx}" y="${top+39}" width="${bw}" height="11" fill="#e9edf0"/>
    <g stroke="#0a0a0b" stroke-width="0.5">
      <line x1="${bx}" y1="${top+11}" x2="${bx+bw}" y2="${top+11}"/>
      <line x1="${bx}" y1="${top+20}" x2="${bx+bw}" y2="${top+20}"/>
      <line x1="${bx}" y1="${top+39}" x2="${bx+bw}" y2="${top+39}"/>
    </g>
    <path d="M ${bx-1.5} ${top+29} l -5 -4 l 0 8 z" fill="#fff"/>
    <text x="-5.5" y="${h/2-4}" text-anchor="middle" font-size="3" fill="#5a5d63" font-family="Arial">AOA</text>
  `);
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

function gduLandscape(w, h, knobR, fs, brand = 'GARMIN') {
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
    <text x="${b.sx + w/2}" y="${b.knobY + 3}" text-anchor="middle" font-size="${fs}" fill="#3a3d44" font-family="sans-serif" letter-spacing="1">${brand}</text>
  `;
}

const gdu460 = () => gduLandscape(275.5, 198.6, 9, 6);
const gdu450 = () => gduLandscape(198.6, 152.7, 8, 5);
const dynonHDX1100 = () => gduLandscape(264, 172, 8, 6, 'DYNON');
const dynonHDX800  = () => gduLandscape(194, 142, 7, 5, 'DYNON');

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

/* ----------------------------------------------------------------------------
 * Real, buyable units — accurate sizes/weights, with a purchase link.
 * -------------------------------------------------------------------------- */

// Round electronic flight instrument (G5 / GI 275 / AV-30) — mini PFD + label.
function efisRound(w, h, label) {
  const sx = -w/2, sy = -h/2, m = 2.6, lab = 5.5;
  const X = sx+m, Y = sy+m, W = w-2*m, H = h-2*m-lab;
  return `<g>
    <rect class="sel-outline" x="${sx}" y="${sy}" width="${w}" height="${h}" rx="4"/>
    <rect x="${sx}" y="${sy}" width="${w}" height="${h}" rx="5" fill="url(#bezelFace)" stroke="#070708" stroke-width="0.8"/>
    <rect x="${sx+1}" y="${sy+1}" width="${w-2}" height="${h-2}" rx="4" fill="none" stroke="#5b5f66" stroke-width="0.4" opacity="0.4"/>
    <rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="#05070a"/>
    ${pfd(X, Y, W, H)}
    <rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="url(#glassGloss)" pointer-events="none"/>
    <text x="0" y="${sy+h-1.7}" text-anchor="middle" font-size="3.4" fill="#b9bfc5" font-family="Arial" font-weight="bold" letter-spacing="0.4">${label}</text>
  </g>`;
}

function avHousing(w, h) {
  const sx = -w/2, sy = -h/2;
  return `<rect class="sel-outline" x="${sx}" y="${sy}" width="${w}" height="${h}" rx="2.5"/>
    <rect x="${sx}" y="${sy}" width="${w}" height="${h}" rx="3" fill="#15171a" stroke="#000" stroke-width="0.8"/>
    <rect x="${sx+1}" y="${sy+1}" width="${w-2}" height="${h-2}" rx="2.5" fill="none" stroke="#3a3d43" stroke-width="0.4" opacity="0.5"/>`;
}

// GTN 750Xi — tall touchscreen navigator.
function gtnTall(w, h) {
  const sx = -w/2, sy = -h/2, m = 2.5, knob = 12;
  const X = sx+m, Y = sy+m, W = w-2*m, H = h-2*m-knob;
  return `<g>
    ${avHousing(w, h)}
    <rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="#04130f"/>
    ${mfdMap(X, Y, W, H)}
    <rect x="${X}" y="${Y}" width="${W}" height="8" fill="#0a1713" opacity="0.9"/>
    <text x="${X+3}" y="${Y+5.6}" font-size="3.4" fill="#19d27a" font-family="Arial" font-weight="bold">DIRECT-TO</text>
    <text x="${X+W-3}" y="${Y+5.6}" text-anchor="end" font-size="3.4" fill="#19d27a" font-family="Arial">115 KT</text>
    <rect x="${sx+5}" y="${sy+h-knob+2.5}" width="11" height="${knob-5}" rx="1" fill="#23262c" stroke="#34373d" stroke-width="0.3"/>
    <rect x="${sx+18}" y="${sy+h-knob+2.5}" width="11" height="${knob-5}" rx="1" fill="#23262c" stroke="#34373d" stroke-width="0.3"/>
    <circle cx="${sx+w-9}" cy="${sy+h-knob/2-0.5}" r="${knob/2-1}" fill="#0c0c0d" stroke="#34373d" stroke-width="0.6"/>
    <circle cx="${sx+w-9}" cy="${sy+h-knob/2-0.5}" r="${knob/2-4}" fill="url(#knobGrad)" stroke="#34373d" stroke-width="0.4"/>
  </g>`;
}

// GTN 650Xi — screen left, keypad + knob right.
function gtnWide(w, h) {
  const sx = -w/2, sy = -h/2, m = 2.2;
  const W = w*0.58, H = h-2*m, X = sx+m, Y = sy+m;
  const cx0 = X+W+3, cols = 3, rows = 2;
  const kw = (w-(m+W)-m-12)/cols, kh = H/rows-1.5;
  let keys = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    keys += `<rect x="${cx0+c*(kw+0.8)}" y="${Y+r*(kh+2)}" width="${kw}" height="${kh}" rx="0.8" fill="#23262c" stroke="#34373d" stroke-width="0.3"/>`;
  return `<g>
    ${avHousing(w, h)}
    <rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="#04130f"/>
    ${mfdMap(X, Y, W, H)}
    ${keys}
    <circle cx="${sx+w-7.5}" cy="${sy+h-9}" r="6" fill="#0c0c0d" stroke="#34373d" stroke-width="0.6"/>
    <circle cx="${sx+w-7.5}" cy="${sy+h-9}" r="3" fill="url(#knobGrad)" stroke="#34373d" stroke-width="0.4"/>
  </g>`;
}

// Short radio/transponder strip — digital readout + buttons + knob.
function radioStrip(w, h, lines) {
  const sx = -w/2, sy = -h/2, m = 1.8, dispW = w*0.46, dispH = h-2*m;
  const fs = lines.length > 1 ? dispH*0.36 : dispH*0.56;
  const txt = lines.map((l, i) => {
    const y = lines.length === 1 ? sy+m+dispH*0.5+fs*0.36 : sy+m+dispH*(i+0.5)/lines.length+fs*0.34;
    return `<text x="${sx+m+dispW/2}" y="${y}" text-anchor="middle" font-size="${fs}" fill="${l.c}" font-family="Consolas, monospace" font-weight="bold">${l.t}</text>`;
  }).join('');
  const ctlX = sx+m+dispW+2.5, ctlW = w-(m+dispW)-m-9, nb = 4;
  const btns = Array.from({length: nb}, (_, i) =>
    `<rect x="${ctlX+i*(ctlW/nb)}" y="${sy+m+0.8}" width="${ctlW/nb-1}" height="${dispH-1.6}" rx="0.6" fill="#23262c" stroke="#34373d" stroke-width="0.3"/>`).join('');
  return `<g>
    ${avHousing(w, h)}
    <rect x="${sx+m}" y="${sy+m}" width="${dispW}" height="${dispH}" rx="1" fill="#04070a" stroke="#1c2430" stroke-width="0.3"/>
    ${txt}${btns}
    <circle cx="${sx+w-5}" cy="0" r="${Math.min(h*0.34, 6)}" fill="url(#knobGrad)" stroke="#0a0a0b" stroke-width="0.5"/>
  </g>`;
}

// GMA 245 audio panel — row of lit buttons.
function audioPanel(w, h) {
  const sx = -w/2, sy = -h/2, m = 2, labels = ['COM1','COM2','NAV','MKR','INT','PA'];
  const n = labels.length, step = (w-2*m)/n, bw = step-1.2;
  const btns = labels.map((L, i) => `<g>
    <rect x="${sx+m+i*step}" y="${sy+m}" width="${bw}" height="${h-2*m}" rx="1" fill="#13241b" stroke="#2f5a44" stroke-width="0.3"/>
    <text x="${sx+m+i*step+bw/2}" y="${1.4}" text-anchor="middle" font-size="${h*0.2}" fill="#37c46a" font-family="Arial">${L}</text>
  </g>`).join('');
  return `<g>${avHousing(w, h)}${btns}</g>`;
}

// Compact touchscreen navigator (GPS 175 / GNC 355 / GNX 375 family) — map
// screen on the left, status bar on top, two buttons + a dual knob on the right.
function navSmall(w, h, opts = {}) {
  const sx = -w/2, sy = -h/2, m = 2.2, knobZone = 21;
  const X = sx+m, Y = sy+m, W = w-2*m-knobZone, H = h-2*m;
  const bar = opts.topLabel ? 7 : 0;
  let inner = `${avHousing(w, h)}
    <rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="#04130f"/>
    ${mfdMap(X, Y+bar, W, H-bar)}`;
  if (opts.topLabel) {
    inner += `<rect x="${X}" y="${Y}" width="${W}" height="${bar}" fill="#0a1713" opacity="0.95"/>
      <text x="${X+2.5}" y="${Y+5}" font-size="3.6" fill="#19d27a" font-family="Arial" font-weight="bold">${opts.topLabel}</text>`;
    if (opts.topRight)
      inner += `<text x="${X+W-2.5}" y="${Y+5}" text-anchor="end" font-size="3.6" fill="${opts.topRightColor || '#7f868d'}" font-family="Arial">${opts.topRight}</text>`;
  }
  const bx = X + W + 2.5, bw = knobZone - 5, kr = Math.min(h*0.32, 6.5);
  inner += `<rect x="${bx}" y="${Y}" width="${bw}" height="6" rx="0.8" fill="#23262c" stroke="#34373d" stroke-width="0.3"/>
    <rect x="${bx}" y="${Y+7.5}" width="${bw}" height="6" rx="0.8" fill="#23262c" stroke="#34373d" stroke-width="0.3"/>
    <circle cx="${bx+bw/2}" cy="${sy+h-m-kr}" r="${kr}" fill="#0c0c0d" stroke="#34373d" stroke-width="0.6"/>
    <circle cx="${bx+bw/2}" cy="${sy+h-m-kr}" r="${kr*0.5}" fill="url(#knobGrad)" stroke="#34373d" stroke-width="0.4"/>`;
  return `<g>${inner}</g>`;
}

// Autopilot mode controller (GMC 507) — row of mode keys + a command knob.
function apController(w, h) {
  const sx = -w/2, sy = -h/2, m = 2.5, knobZone = 15;
  const labels = ['AP','FD','HDG','NAV','ALT','VS','VNV','LVL'];
  const n = labels.length, area = w-2*m-knobZone, step = area/n, bw = step-1.4;
  const btns = labels.map((L, i) => `<g>
    <rect x="${sx+m+i*step}" y="${sy+m}" width="${bw}" height="${h-2*m}" rx="1" fill="#1a1d22" stroke="#34373d" stroke-width="0.3"/>
    <text x="${sx+m+i*step+bw/2}" y="1" text-anchor="middle" font-size="${Math.min(4, h*0.16)}" fill="#cdd2d7" font-family="Arial">${L}</text></g>`).join('');
  const kr = Math.min(h*0.34, 8), kx = sx+w-m-knobZone/2;
  return `<g>${avHousing(w, h)}${btns}
    <circle cx="${kx}" cy="0" r="${kr}" fill="#0c0c0d" stroke="#34373d" stroke-width="0.6"/>
    <circle cx="${kx}" cy="0" r="${kr*0.5}" fill="url(#knobGrad)" stroke="#34373d" stroke-width="0.4"/>
  </g>`;
}

/* ----------------------------------------------------------------------------
 * Panel furniture — switches, breakers, knobs, vents, placards. Generic /
 * idealized (no purchase link); pure parametric SVG centered on origin. Sizes
 * here must match the catalog w/h so the hit area and thumbnails line up.
 * -------------------------------------------------------------------------- */
function selRect(w, h, rx = 2) {
  return `<rect class="sel-outline" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="${rx}"/>`;
}

// Escape user-supplied label text before it goes into SVG markup.
const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Toggle (bat-handle) switch.
function toggleSwitch() {
  return `<g>${selRect(13, 20)}
    <circle cy="2" r="5.2" fill="url(#knobGrad)" stroke="#0a0a0b" stroke-width="0.5"/>
    <circle cy="2" r="3.2" fill="#26282c"/>
    <g transform="rotate(-14 0 2)">
      <rect x="-1.5" y="-9" width="3" height="11.5" rx="1.5" fill="#cfd4d9" stroke="#8a9097" stroke-width="0.3"/>
      <circle cx="0" cy="-9" r="2.1" fill="#eef1f4" stroke="#9aa0a6" stroke-width="0.3"/>
    </g></g>`;
}

// Rocker switch (green tell-tale).
function rockerSwitch() {
  const w = 13, h = 18;
  return `<g>${selRect(w, h)}
    <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="2" fill="#15171a" stroke="#000" stroke-width="0.6"/>
    <rect x="${-w/2+1.4}" y="${-h/2+1.4}" width="${w-2.8}" height="${h/2-1.6}" rx="1.4" fill="#2b2f35"/>
    <rect x="${-w/2+1.4}" y="0.2" width="${w-2.8}" height="${h/2-1.6}" rx="1.4" fill="#0e1013"/>
    <circle cx="0" cy="${-h/4}" r="1.1" fill="#1faa4b"/></g>`;
}

// Split master / alternator rocker (red).
function splitRocker() {
  const w = 22, h = 20;
  const one = (cx, lab) => `<g transform="translate(${cx} 1)">
    <rect x="-4.5" y="-7" width="9" height="15" rx="1.6" fill="#15171a" stroke="#000" stroke-width="0.5"/>
    <rect x="-3.3" y="-5.6" width="6.6" height="5.8" rx="1" fill="#b02a2a"/>
    <rect x="-3.3" y="0.6" width="6.6" height="5.8" rx="1" fill="#3a1416"/>
    <text x="0" y="-8.4" text-anchor="middle" font-size="2.8" fill="#b9bfc5" font-family="Arial">${lab}</text></g>`;
  return `<g>${selRect(w, h)}${one(-5.5, 'BAT')}${one(5.5, 'ALT')}</g>`;
}

// Magneto / ignition rotary (OFF-L-R-BOTH-START).
function magSwitch() {
  const sz = 30, r = 11;
  const labs = [['OFF', -100], ['L', -50], ['R', 0], ['BOTH', 50], ['START', 105]];
  const txt = labs.map(([t, a]) => { const [x, y] = pol(r + 4, a); return `<text x="${x}" y="${y+1}" text-anchor="middle" font-size="2.6" fill="#9aa0a6" font-family="Arial">${t}</text>`; }).join('');
  const tk = labs.map(([, a]) => { const [x1, y1] = pol(r + 1.4, a), [x2, y2] = pol(r - 0.4, a); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#9aa0a6" stroke-width="0.5"/>`; }).join('');
  return `<g>${selRect(sz, sz, sz/2)}
    <circle r="${r+3}" fill="url(#bezelFace)" stroke="#070708" stroke-width="0.6"/>
    ${tk}${txt}
    <circle r="${r-2}" fill="url(#knobGrad)" stroke="#0a0a0b" stroke-width="0.5"/>
    <g transform="rotate(50)"><rect x="-1" y="${-(r-1)}" width="2" height="${r-3}" rx="1" fill="#d7dce1"/></g>
    <circle r="2" fill="#3a3d42"/></g>`;
}

// Push button (starter / generic).
function pushButton(color = '#b02a2a', text = 'START') {
  const sz = 20, r = 8;
  return `<g>${selRect(sz, sz, sz/2)}
    <circle r="${r+1.4}" fill="url(#bezelFace)" stroke="#070708" stroke-width="0.5"/>
    <circle r="${r}" fill="${color}" stroke="#000" stroke-width="0.4"/>
    <circle r="${r}" fill="url(#glassGloss)"/>
    <text x="0" y="1.4" text-anchor="middle" font-size="3" fill="#fff" font-family="Arial" font-weight="bold">${text}</text></g>`;
}

// Push-pull circuit breaker.
function breaker(rating = '5A') {
  const w = 11, h = 15;
  return `<g>${selRect(w, h)}
    <circle cy="-1" r="4.6" fill="url(#knobGrad)" stroke="#0a0a0b" stroke-width="0.5"/>
    <circle cy="-1" r="3" fill="#1a1c1f" stroke="#3a3d42" stroke-width="0.3"/>
    <rect x="-3" y="-2.2" width="6" height="2.4" rx="0.6" fill="#0e1013"/>
    <text x="0" y="6.6" text-anchor="middle" font-size="3" fill="#9aa0a6" font-family="Arial">${rating}</text></g>`;
}

// Rotary dimmer / rheostat knob.
function dimmerKnob() {
  const sz = 20, r = 8;
  const ticks = [...Array(9)].map((_, i) => { const a = -120 + i * 30; const [x1, y1] = pol(r + 2.4, a), [x2, y2] = pol(r + 1.2, a); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#6b7178" stroke-width="0.4"/>`; }).join('');
  return `<g>${selRect(sz, sz, sz/2)}${ticks}
    <circle r="${r+1}" fill="url(#bezelFace)" stroke="#070708" stroke-width="0.5"/>
    <circle r="${r}" fill="url(#knobGrad)" stroke="#0a0a0b" stroke-width="0.4"/>
    <rect x="-0.7" y="${-r}" width="1.4" height="4" rx="0.7" fill="#d7dce1"/></g>`;
}

// Dual USB charge port.
function usbPort() {
  const w = 30, h = 14;
  const slot = (cy) => `<rect x="-7" y="${cy-1.6}" width="14" height="3.2" rx="0.4" fill="#0a0c10" stroke="#3a3d42" stroke-width="0.3"/><rect x="-6" y="${cy-0.4}" width="4" height="0.8" fill="#2f6fc4"/>`;
  return `<g>${selRect(w, h)}
    <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="2" fill="#15171a" stroke="#000" stroke-width="0.6"/>
    ${slot(-3.4)}${slot(3.4)}</g>`;
}

// Eyeball (NACA) air vent.
function eyeballVent() {
  const R = 26, br = 22, bz = 13;
  const slats = [...Array(4)].map((_, i) => { const a = i * 45; const [x1, y1] = pol(bz - 1, a), [x2, y2] = pol(bz - 1, a + 180); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }).join('');
  return `<g>${selRect(R*2, R*2, R)}
    <circle r="${R-1}" fill="url(#bezelFace)" stroke="#070708" stroke-width="0.8"/>
    <circle r="${br}" fill="#0c0d0f" stroke="#26282c" stroke-width="0.6"/>
    <circle r="${bz}" fill="url(#knobGrad)" stroke="#0a0a0b" stroke-width="0.5"/>
    <circle r="${bz}" fill="url(#glassGloss)"/>
    <g stroke="#3a3d42" stroke-width="0.5">${slats}</g>
    <circle cx="-3" cy="-3" r="3" fill="#000" opacity="0.5"/></g>`;
}

// Push-pull cable control (cabin heat / air, etc.) — label via a placard.
function cableControl(color = '#1a1c1f') {
  const sz = 20, r = 7;
  return `<g>${selRect(sz, sz, 3)}
    <circle r="${r+2}" fill="url(#bezelFace)" stroke="#070708" stroke-width="0.5"/>
    <circle r="${r}" fill="${color}" stroke="#000" stroke-width="0.5"/>
    <circle r="${r}" fill="url(#glassGloss)"/>
    <circle r="2.4" fill="#0a0a0b"/></g>`;
}

// Annunciator / warning-light cluster.
function annunciator() {
  const w = 64, h = 16, labs = [['OIL', '#e02424'], ['VOLTS', '#f2c200'], ['FUEL', '#e02424'], ['CANOPY', '#f2c200']];
  const n = labs.length, step = (w - 4) / n;
  const cells = labs.map(([t, c], i) => `<g transform="translate(${-w/2+2+step*(i+0.5)} 0)">
    <rect x="${-step/2+1}" y="-6" width="${step-2}" height="12" rx="1.2" fill="#0e1013" stroke="#26282c" stroke-width="0.3"/>
    <text x="0" y="1.6" text-anchor="middle" font-size="3.2" fill="${c}" font-family="Arial" font-weight="bold">${t}</text></g>`).join('');
  return `<g>${selRect(w, h)}<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="2" fill="#15171a" stroke="#000" stroke-width="0.6"/>${cells}</g>`;
}

// N-number placard — editable text (default shown).
function nNumberPlacard(text = 'N1234') {
  const w = 70, h = 16, t = String(text);
  const fs = Math.max(4, Math.min(9, (w - 8) / (t.length * 0.66 || 1)));
  return `<g>${selRect(w, h)}
    <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="1.5" fill="#0c0d0f" stroke="#3a3d42" stroke-width="0.4"/>
    <text x="0" y="${fs*0.36}" text-anchor="middle" font-size="${fs}" fill="#e6edf3" font-family="Arial" font-weight="bold" letter-spacing="2">${esc(t)}</text></g>`;
}

// Warning / instruction placard — editable text.
function placard(text = 'EXPERIMENTAL') {
  const w = 56, h = 12, t = String(text);
  const fs = Math.max(3, Math.min(5.2, (w - 5) / (t.length * 0.6 || 1)));
  return `<g>${selRect(w, h)}
    <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="1.2" fill="#b02a2a" stroke="#5a1416" stroke-width="0.4"/>
    <text x="0" y="${fs*0.36}" text-anchor="middle" font-size="${fs}" fill="#fff" font-family="Arial" font-weight="bold" letter-spacing="0.6">${esc(t)}</text></g>`;
}

// Generic engraved label strip — editable text, for annotating switches/breakers.
function labelStrip(text = 'LABEL') {
  const w = 48, h = 11, t = String(text);
  const fs = Math.max(3, Math.min(5.5, (w - 5) / (t.length * 0.62 || 1)));
  return `<g>${selRect(w, h, 1.5)}
    <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="1.5" fill="#16181c" stroke="#2a2c30" stroke-width="0.4"/>
    <text x="0" y="${fs*0.36}" text-anchor="middle" font-size="${fs}" fill="#e6edf3" font-family="Arial" font-weight="bold" letter-spacing="0.4">${esc(t)}</text></g>`;
}

const swToggle = () => toggleSwitch();
const swRocker = () => rockerSwitch();
const swSplit  = () => splitRocker();
const swMag    = () => magSwitch();
const btnStart = () => pushButton('#b02a2a', 'START');
const cb5      = () => breaker('5A');
const knobDim  = () => dimmerKnob();
const usb2     = () => usbPort();
const vent     = () => eyeballVent();
const ctlHeat  = () => cableControl('#b02a2a');
const ctlAir   = () => cableControl('#1a1c1f');
const annun    = () => annunciator();
const placardN = (t) => nNumberPlacard(t);
const placardX = (t) => placard(t);
const labelTag = (t) => labelStrip(t);

/* ----------------------------------------------------------------------------
 * Engine & fuel monitoring
 * -------------------------------------------------------------------------- */

// Generic round manifold-pressure gauge (3⅛″).
function manifold() {
  const a0 = 40, sweep = 260, ang = v => a0 + (v - 10) / (35 - 10) * sweep;
  const ticks = [], nums = [];
  for (let v = 10; v <= 35; v += 1) {
    const major = v % 5 === 0, a = ang(v);
    const [x1, y1] = pol(37, a), [x2, y2] = pol(major ? 31 : 34, a);
    ticks.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="${major?0.9:0.45}"/>`);
    if (major) { const [nx, ny] = pol(25, a); nums.push(`<text x="${nx}" y="${ny+2}" text-anchor="middle" font-size="5" fill="#fff" font-family="Arial" font-weight="bold">${v}</text>`); }
  }
  return `<g>${bezel()}
    <path d="${arc(28, ang(15), ang(30))}" fill="none" stroke="#1faa4b" stroke-width="2.4"/>
    ${ticks.join('')}${nums.join('')}
    ${title('MAN PRESS', -13, 4)}${title('IN Hg', 16, 3.4)}
    <g transform="rotate(${ang(25)})"><path d="M -1 3 L -0.5 -30 L 0.5 -30 L 1 3 Z" fill="#f4f6f8"/></g>
    ${hub(2.4)}${glass()}</g>`;
}

// Generic round tachometer (3⅛″) with hour readout.
function tachometer() {
  const a0 = 40, sweep = 260, ang = v => a0 + v / 35 * sweep; // 0..3500 rpm (×100)
  const ticks = [], nums = [];
  for (let v = 0; v <= 35; v += 1) {
    const major = v % 5 === 0, a = ang(v);
    const [x1, y1] = pol(37, a), [x2, y2] = pol(major ? 31 : 34, a);
    ticks.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="${major?0.9:0.45}"/>`);
    if (major) { const [nx, ny] = pol(25, a); nums.push(`<text x="${nx}" y="${ny+2}" text-anchor="middle" font-size="5" fill="#fff" font-family="Arial" font-weight="bold">${v/10}</text>`); }
  }
  const [rx0, ry0] = pol(31, ang(27)), [rx1, ry1] = pol(37, ang(27));
  return `<g>${bezel()}
    <path d="${arc(28, ang(20), ang(27))}" fill="none" stroke="#1faa4b" stroke-width="2.4"/>
    <line x1="${rx0}" y1="${ry0}" x2="${rx1}" y2="${ry1}" stroke="#e02424" stroke-width="1.6"/>
    ${ticks.join('')}${nums.join('')}
    ${title('RPM', -13, 4.2)}${title('× 100', 11, 3)}
    <g transform="translate(0 17)"><rect x="-10" y="-3" width="20" height="6" rx="0.8" fill="#0c0c0e" stroke="#5a5d63" stroke-width="0.3"/>
      <text x="0" y="1.8" text-anchor="middle" font-size="3.6" fill="#e9edf0" font-family="Consolas, monospace">1234.5</text></g>
    <g transform="rotate(${ang(24)})"><path d="M -1 3 L -0.5 -30 L 0.5 -30 L 1 3 Z" fill="#f4f6f8"/></g>
    ${hub(2.4)}${glass()}</g>`;
}

// Squarish digital engine monitor (EI CGR-30P style).
function engineMon(w, h) {
  const m = 5, X = -w/2+m, Y = -h/2+m, W = w-2*m, H = h-2*m, o = w/2-7;
  const bars = [...Array(6)].map((_, i) => { const bw = (W*0.5)/6, bx = X+W*0.46+i*bw, bh = 9+((i*53)%15); return `<rect x="${bx}" y="${Y+H-7-bh}" width="${bw-1}" height="${bh}" fill="${i%2?'#e7c93b':'#e0552c'}"/>`; }).join('');
  return `<g>
    <rect class="sel-outline" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="5"/>
    <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="6" fill="url(#bezelFace)" stroke="#070708" stroke-width="0.8"/>
    ${screw(-o,-o)}${screw(o,-o)}${screw(-o,o)}${screw(o,o)}
    <rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="#05070a"/>
    <text x="${X+3}" y="${Y+13}" font-size="10" fill="#19d27a" font-family="Consolas, monospace" font-weight="bold">2400</text>
    <text x="${X+3}" y="${Y+19}" font-size="3.2" fill="#9aa0a6" font-family="Arial">RPM</text>
    <text x="${X+W-3}" y="${Y+12}" text-anchor="end" font-size="6.5" fill="#e9edf0" font-family="Consolas, monospace">28.4</text>
    <text x="${X+W-3}" y="${Y+17}" text-anchor="end" font-size="3" fill="#9aa0a6" font-family="Arial">MAP</text>
    ${bars}
    <text x="${X+2}" y="${Y+H-1.5}" font-size="3" fill="#6b7178" font-family="Arial" letter-spacing="1.5">EGT  CHT  FF  OIL</text>
    <rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="url(#glassGloss)" pointer-events="none"/></g>`;
}

// Rectangular primary engine display (JPI EDM-900 style) — columns of bars.
function edmDisplay(w, h) {
  const m = 2.5, X = -w/2+m, Y = -h/2+m, W = w-2*m, H = h-2*m;
  const cols = 4, cw = (W*0.52)/cols;
  const colBars = [...Array(cols)].map((_, i) => {
    const bx = X+3+i*cw, bh = 14+((i*61)%20);
    return `<rect x="${bx}" y="${Y+H-4-bh}" width="${cw-1.5}" height="${bh}" fill="${i%2?'#e0552c':'#e7c93b'}"/>
            <text x="${bx+(cw-1.5)/2}" y="${Y+H-1}" text-anchor="middle" font-size="2.6" fill="#9aa0a6" font-family="Arial">${i+1}</text>`;
  }).join('');
  const reads = [['RPM','2400','#19d27a'],['MAP','28.4','#e9edf0'],['OIL','185°','#e9edf0'],['FUEL','12.1','#19d27a']];
  const rd = reads.map(([l, v, c], i) => `<g transform="translate(${X+W*0.58} ${Y+6+i*((H-8)/4)})">
    <text x="0" y="0" font-size="3" fill="#9aa0a6" font-family="Arial">${l}</text>
    <text x="${W*0.4}" y="0" text-anchor="end" font-size="5" fill="${c}" font-family="Consolas, monospace" font-weight="bold">${v}</text></g>`).join('');
  return `<g>${avHousing(w, h)}
    <rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="#05070a"/>
    ${colBars}${rd}
    <rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="url(#glassGloss)" pointer-events="none"/></g>`;
}

/* ----------------------------------------------------------------------------
 * Time, environment & standby
 * -------------------------------------------------------------------------- */

// Davtron M803 — digital clock / OAT / voltmeter (2¼″ mount).
function davtronM803() {
  const SZ = 57;
  return `<g>${bezel('', SZ)}
    <rect x="-18" y="-8" width="36" height="13" rx="1.5" fill="#0a0c10" stroke="#1c2430" stroke-width="0.4"/>
    <text x="0" y="2.4" text-anchor="middle" font-size="9" fill="#e0552c" font-family="Consolas, monospace" font-weight="bold">12:34</text>
    <text x="-16" y="13.5" font-size="3.2" fill="#9aa0a6" font-family="Arial">15°C</text>
    <text x="16" y="13.5" text-anchor="end" font-size="3.2" fill="#9aa0a6" font-family="Arial">13.8V</text>
    ${glass(SZ)}</g>`;
}

// CO Guardian panel-mount carbon-monoxide detector.
function coDetector() {
  const w = 57, h = 38, m = 2;
  return `<g>${avHousing(w, h)}
    <text x="${-w/2+4}" y="-7" font-size="6" fill="#b9bfc5" font-family="Arial" font-weight="bold">CO</text>
    <text x="${-w/2+4}" y="-1.5" font-size="2.8" fill="#6b7178" font-family="Arial">GUARDIAN</text>
    <circle cx="${-w/2+5}" cy="8" r="2" fill="#1faa4b"/>
    <text x="${-w/2+9}" y="9" font-size="2.8" fill="#6b7178" font-family="Arial">OK</text>
    <rect x="2" y="-9" width="${w/2-4}" height="16" rx="1.2" fill="#0a0c10" stroke="#1c2430" stroke-width="0.3"/>
    <text x="${2+(w/2-4)/2}" y="-1" text-anchor="middle" font-size="7" fill="#19d27a" font-family="Consolas, monospace" font-weight="bold">000</text>
    <text x="${2+(w/2-4)/2}" y="4.5" text-anchor="middle" font-size="3" fill="#9aa0a6" font-family="Arial">PPM</text></g>`;
}

// Generic mechanical Hobbs hour meter.
function hobbsMeter() {
  const w = 42, h = 20, m = 2;
  const digits = '01234', tenth = '6';
  const dx = (i) => -16 + i * 6.2;
  const drum = digits.split('').map((d, i) => `<rect x="${dx(i)-2.6}" y="-5" width="5.2" height="10" rx="0.6" fill="#101216" stroke="#2a2c30" stroke-width="0.3"/><text x="${dx(i)}" y="3" text-anchor="middle" font-size="6.4" fill="#e9edf0" font-family="Consolas, monospace">${d}</text>`).join('');
  return `<g>${avHousing(w, h)}
    ${drum}
    <rect x="${dx(5)-2.6}" y="-5" width="5.2" height="10" rx="0.6" fill="#3a1416" stroke="#5a1416" stroke-width="0.3"/>
    <text x="${dx(5)}" y="3" text-anchor="middle" font-size="6.4" fill="#ff6b6b" font-family="Consolas, monospace">${tenth}</text>
    <text x="${w/2-2}" y="${h/2-1.5}" text-anchor="end" font-size="2.6" fill="#6b7178" font-family="Arial">HOBBS</text></g>`;
}

// Generic whiskey (wet) compass.
function compass() {
  const SZ = 57, r = 19;
  const cards = [['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([t, a]) => { const [x, y] = pol(r, a); return `<text x="${x}" y="${y+2}" text-anchor="middle" font-size="${t==='N'?6:5}" fill="${t==='N'?'#ff6b6b':'#e9edf0'}" font-family="Arial" font-weight="bold">${t}</text>`; }).join('');
  const minor = [30,60,120,150,210,240,300,330].map(a => { const [x, y] = pol(r, a); return `<circle cx="${x}" cy="${y}" r="0.9" fill="#9aa0a6"/>`; }).join('');
  return `<g>${bezel('', SZ)}
    <circle r="${r+4}" fill="#0a0c10" stroke="#26282c" stroke-width="0.5"/>
    ${cards}${minor}
    <line x1="0" y1="${-r-3}" x2="0" y2="${-r+1}" stroke="#ffd23a" stroke-width="1"/>
    <path d="M -2.4 0 H 2.4" stroke="#ffd23a" stroke-width="0.8"/>
    <circle r="1.4" fill="#ffd23a"/>
    ${glass(SZ)}</g>`;
}

// Generic G-meter / accelerometer (2¼″) — RV-8 aerobatic.
function gMeter() {
  const SZ = 57, r = 20, a0 = 45, sweep = 270, ang = g => a0 + (g + 4) / 12 * sweep; // -4..+8 G
  const ticks = [], nums = [];
  for (let g = -4; g <= 8; g += 1) {
    const a = ang(g), [x1, y1] = pol(r, a), [x2, y2] = pol(r - 3, a);
    ticks.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0a0a0b" stroke-width="0.6"/>`);
    const [nx, ny] = pol(r - 6, a); nums.push(`<text x="${nx}" y="${ny+1.5}" text-anchor="middle" font-size="3.4" fill="#0a0a0b" font-family="Arial" font-weight="bold">${g}</text>`);
  }
  return `<g>${bezel('', SZ)}
    <circle r="${r+3}" fill="#e9edf0"/>
    ${ticks.join('')}${nums.join('')}
    <text x="0" y="-6" text-anchor="middle" font-size="3.4" fill="#3a3d42" font-family="Arial">G</text>
    <text x="0" y="9" text-anchor="middle" font-size="2.4" fill="#6b7178" font-family="Arial">PUSH-RESET</text>
    <g transform="rotate(${ang(1)})"><path d="M -0.9 4 L -0.4 ${-(r+1)} L 0.4 ${-(r+1)} L 0.9 4 Z" fill="#111"/></g>
    <circle r="1.6" fill="#3a3d42"/>
    ${glass(SZ)}</g>`;
}

/* ----------------------------------------------------------------------------
 * Autopilot controllers
 * -------------------------------------------------------------------------- */

// Trio Pro Pilot — round (3⅛″) autopilot head with display + knob.
function trioProPilot() {
  return `<g>${bezel()}
    <rect x="-24" y="-15" width="48" height="16" rx="1.5" fill="#04130f" stroke="#0a1713" stroke-width="0.4"/>
    <text x="-21" y="-8.5" font-size="3.8" fill="#19d27a" font-family="Consolas, monospace" font-weight="bold">NAV</text>
    <text x="21" y="-8.5" text-anchor="end" font-size="3.8" fill="#19d27a" font-family="Consolas, monospace">5500</text>
    <text x="0" y="-3" text-anchor="middle" font-size="3" fill="#7f868d" font-family="Arial">ALT HOLD</text>
    <g>${['MODE','ALT'].map((t, i) => `<rect x="${-22+i*26}" y="5" width="18" height="7" rx="1" fill="#1a1d22" stroke="#34373d" stroke-width="0.3"/><text x="${-22+i*26+9}" y="9.8" text-anchor="middle" font-size="3" fill="#cdd2d7" font-family="Arial">${t}</text>`).join('')}</g>
    <circle cx="0" cy="22" r="7" fill="#0c0c0d" stroke="#34373d" stroke-width="0.6"/>
    <circle cx="0" cy="22" r="3.4" fill="url(#knobGrad)" stroke="#34373d" stroke-width="0.4"/>
    ${glass()}</g>`;
}

// Dynon SkyView autopilot control panel (horizontal).
function dynonAP(w, h) {
  const m = 2.5, labels = ['AP', 'HDG', 'NAV', 'ALT', 'VS'];
  const knobZone = 16, n = labels.length, area = w-2*m-knobZone, step = area/n, bw = step-1.4;
  const btns = labels.map((L, i) => `<g>
    <rect x="${-w/2+m+i*step}" y="${-h/2+m}" width="${bw}" height="${h-2*m}" rx="1" fill="#1a1d22" stroke="#34373d" stroke-width="0.3"/>
    <text x="${-w/2+m+i*step+bw/2}" y="1" text-anchor="middle" font-size="3.6" fill="#cdd2d7" font-family="Arial">${L}</text></g>`).join('');
  const kr = Math.min(h*0.34, 8), kx = w/2-m-knobZone/2;
  return `<g>${avHousing(w, h)}${btns}
    <circle cx="${kx}" cy="0" r="${kr}" fill="#0c0c0d" stroke="#34373d" stroke-width="0.6"/>
    <circle cx="${kx}" cy="0" r="${kr*0.5}" fill="url(#knobGrad)" stroke="#34373d" stroke-width="0.4"/></g>`;
}

const cgr30p  = () => engineMon(83, 83);
const edm900  = () => edmDisplay(102, 79);
const mapGauge = () => manifold();
const tach    = () => tachometer();
const m803    = () => davtronM803();
const coGuard = () => coDetector();
const hobbs   = () => hobbsMeter();
const wetCompass = () => compass();
const gmeter  = () => gMeter();
const trio    = () => trioProPilot();
const dynonAPp = () => dynonAP(90, 46);

const g5      = () => efisRound(86, 91, 'GARMIN G5');
const gi275   = () => efisRound(86, 86, 'GI 275');
const av30    = () => efisRound(86, 86, 'AV-30');
const gtn750  = () => gtnTall(159, 152);
const gtn650  = () => gtnWide(159, 67);
const gps175  = () => navSmall(159, 51, { topLabel: 'GPS 175' });
const gnc355  = () => navSmall(159, 51, { topLabel: 'COM', topRight: '118.00', topRightColor: '#19d27a' });
const gnx375  = () => navSmall(159, 51, { topLabel: 'XPDR 1200', topRight: 'ADS-B' });
const gtx335  = () => radioStrip(160, 43, [{ t: '1200', c: '#19d27a' }]);
const gtx345  = () => radioStrip(160, 43, [{ t: '1200', c: '#19d27a' }, { t: 'ADS-B', c: '#7f868d' }]);
const gtr205  = () => radioStrip(159, 34, [{ t: '118.00', c: '#19d27a' }, { t: '121.50', c: '#7f868d' }]);
const gma245  = () => audioPanel(159, 33);
const gmc507  = () => apController(159, 53);

const SPRUCE = 'Aircraft Spruce';
const L = {
  g3x:    'https://www.aircraftspruce.com/catalog/avpages/garming3xtouch450.php',
  g5:     'https://www.aircraftspruce.com/catalog/avpages/garmin-g5.php',
  gi275:  'https://www.aircraftspruce.com/catalog/avpages/garmin_gi275cdimfd.php',
  av30:   'https://www.aircraftspruce.com/catalog/inpages/uavionix_av-30.php',
  gtn750: 'https://www.aircraftspruce.com/catalog/avpages/ngar750.php',
  gtn650: 'https://www.aircraftspruce.com/catalog/avpages/ngar650.php',
  gps175: 'https://www.garmin.com/en-US/p/577202/',
  gnc355: 'https://www.garmin.com/en-US/p/689774/',
  gnx375: 'https://www.aircraftspruce.com/catalog/avpages/garmin_11-17227.php',
  gtx335: 'https://www.aircraftspruce.com/catalog/avpages/garmin_gtx335promo.php',
  gtx345: 'https://www.aircraftspruce.com/catalog/avpages/garmin_gtx345.php',
  gtr205: 'https://www.aircraftspruce.com/catalog/avpages/garmin_gtr205.php',
  gma245: 'https://www.garmin.com/en-US/c/aviation/audio-panels-radios/',
  gmc507: 'https://www.aircraftspruce.com/catalog/avpages/garmin11-16219.php',
  hdx:    'https://www.aircraftspruce.com/catalog/avpages/dynonskyview-hdx.php',
  eagle:  'https://www.aircraftspruce.com/catalog/inpages/aoaeaglekit.php',
  cgr30p: 'https://www.aircraftspruce.com/catalog/inpages/eicgr30p10-05345.php',
  edm900: 'https://www.aircraftspruce.com/catalog/inpages/edm900.php',
  m803:   'https://www.aircraftspruce.com/catalog/inpages/davtronclock.php',
  co:     'https://www.guardianavionics.com/guardian-353-101-panel-co-detector-experimental-aircraft',
  trio:   'https://www.trioavionics.com/ProPilot.htm',
  dynonap:'https://www.aircraftspruce.com/catalog/inpages/dynon_autopilotpanel.php',
};

/* -------------------------------------------------------------------------- */

// weight is in pounds. amps is the typical current draw at 12 V nominal (for a
// running electrical-load tally) — pneumatic gauges draw 0; lighting excluded.
// For the idealized instruments weight/amps are representative averages (real
// units vary by make/model); real units list make/model + a link.
const CATALOG = [
  { id: 'ai',  name: 'Attitude Indicator', category: '3⅛″ Round', w: BZ, h: BZ, weight: 1.6, amps: 0.5, svg: attitude },
  { id: 'dg',  name: 'Directional Gyro',   category: '3⅛″ Round', w: BZ, h: BZ, weight: 1.8, amps: 0.5, svg: dg },
  { id: 'asi', name: 'Airspeed',           category: '3⅛″ Round', w: BZ, h: BZ, weight: 0.6, amps: 0,   svg: airspeed },
  { id: 'alt', name: 'Altimeter',          category: '3⅛″ Round', w: BZ, h: BZ, weight: 0.8, amps: 0,   svg: altimeter },
  { id: 'vsi', name: 'Vertical Speed',     category: '3⅛″ Round', w: BZ, h: BZ, weight: 0.7, amps: 0,   svg: vsi },
  { id: 'tc',  name: 'Turn Coordinator',   category: '3⅛″ Round', w: BZ, h: BZ, weight: 1.2, amps: 0.3, svg: turn },
  { id: 'lri',       name: 'Lift Reserve Indicator (2¼″)',  category: 'AoA / Lift', w: 57, h: 57, weight: 0.5, amps: 0,   svg: lri },
  { id: 'aoaeagle',  name: 'AoA — Alpha Systems Eagle',      category: 'AoA / Lift', w: 38, h: 66, weight: 0.3, amps: 0.1, svg: aoaEagle, link: L.eagle, vendor: SPRUCE },
  { id: 'aoaladder', name: 'AoA — LED ladder (generic)',     category: 'AoA / Lift', w: 32, h: 64, weight: 0.3, amps: 0.1, svg: aoaLadder },

  // Real electronic flight instruments (3⅛″ replacements)
  { id: 'g5',    name: 'Garmin G5',            category: 'Electronic Flight Instruments', w: 86, h: 91, weight: 0.83, amps: 0.25, svg: g5,    link: L.g5,    vendor: SPRUCE },
  { id: 'gi275', name: 'Garmin GI 275',        category: 'Electronic Flight Instruments', w: 86, h: 86, weight: 0.85, amps: 0.6,  svg: gi275, link: L.gi275, vendor: SPRUCE },
  { id: 'av30',  name: 'uAvionix AV-30-E',     category: 'Electronic Flight Instruments', w: 86, h: 86, weight: 0.5,  amps: 0.2,  svg: av30,  link: L.av30,  vendor: SPRUCE },

  // Real nav / comm / transponder / audio (6.25″ standard width)
  { id: 'gtn750', name: 'Garmin GTN 750Xi',    category: 'Nav / Comm / Transponder', w: 159, h: 152, weight: 5.5, amps: 3.0, svg: gtn750, link: L.gtn750, vendor: SPRUCE },
  { id: 'gtn650', name: 'Garmin GTN 650Xi',    category: 'Nav / Comm / Transponder', w: 159, h: 67,  weight: 3.0, amps: 1.5, svg: gtn650, link: L.gtn650, vendor: SPRUCE },
  { id: 'gps175', name: 'Garmin GPS 175',       category: 'Nav / Comm / Transponder', w: 159, h: 51, weight: 1.3, amps: 0.6, svg: gps175, link: L.gps175, vendor: 'Garmin' },
  { id: 'gnc355', name: 'Garmin GNC 355 (GPS/COM)', category: 'Nav / Comm / Transponder', w: 159, h: 51, weight: 3.3, amps: 1.0, svg: gnc355, link: L.gnc355, vendor: 'Garmin' },
  { id: 'gnx375', name: 'Garmin GNX 375 (GPS/XPDR)', category: 'Nav / Comm / Transponder', w: 159, h: 51, weight: 3.2, amps: 1.2, svg: gnx375, link: L.gnx375, vendor: SPRUCE },
  { id: 'gtr205', name: 'Garmin GTR 205 (COM)', category: 'Nav / Comm / Transponder', w: 159, h: 34, weight: 1.5, amps: 1.5, svg: gtr205, link: L.gtr205, vendor: SPRUCE },
  { id: 'gtx335', name: 'Garmin GTX 335 (XPDR)', category: 'Nav / Comm / Transponder', w: 160, h: 43, weight: 1.7, amps: 0.5, svg: gtx335, link: L.gtx335, vendor: SPRUCE },
  { id: 'gtx345', name: 'Garmin GTX 345 (ADS-B XPDR)', category: 'Nav / Comm / Transponder', w: 160, h: 43, weight: 2.9, amps: 0.5, svg: gtx345, link: L.gtx345, vendor: SPRUCE },
  { id: 'gma245', name: 'Garmin GMA 245 (Audio)', category: 'Nav / Comm / Transponder', w: 159, h: 33, weight: 1.0, amps: 0.3, svg: gma245, link: L.gma245, vendor: 'Garmin' },

  // Engine & fuel monitoring
  { id: 'cgr30p', name: 'EI CGR-30P (engine monitor)', category: 'Engine & Fuel', w: 83, h: 83, weight: 1.1, amps: 0.5, svg: cgr30p, link: L.cgr30p, vendor: SPRUCE },
  { id: 'edm900', name: 'JPI EDM-900 (engine monitor)', category: 'Engine & Fuel', w: 102, h: 79, weight: 1.7, amps: 0.5, svg: edm900, link: L.edm900, vendor: SPRUCE },
  { id: 'map',  name: 'Manifold Pressure',  category: 'Engine & Fuel', w: BZ, h: BZ, weight: 0.6, amps: 0,   svg: mapGauge },
  { id: 'tach', name: 'Tachometer',         category: 'Engine & Fuel', w: BZ, h: BZ, weight: 0.7, amps: 0.1, svg: tach },

  // Time, environment & standby
  { id: 'm803',     name: 'Davtron M803 (clock/OAT/volts)', category: 'Time / Safety / Standby', w: 57, h: 57, weight: 0.31, amps: 0.1, svg: m803, link: L.m803, vendor: SPRUCE },
  { id: 'co',       name: 'CO Guardian (CO detector)', category: 'Time / Safety / Standby', w: 57, h: 38, weight: 0.22, amps: 0.1, svg: coGuard, link: L.co, vendor: 'Guardian Avionics' },
  { id: 'hobbs',    name: 'Hobbs hour meter',  category: 'Time / Safety / Standby', w: 42, h: 20, weight: 0.2, amps: 0,   svg: hobbs },
  { id: 'compass',  name: 'Whiskey compass',   category: 'Time / Safety / Standby', w: 57, h: 57, weight: 0.5, amps: 0,   svg: wetCompass },
  { id: 'gmeter',   name: 'G-meter (2¼″)',     category: 'Time / Safety / Standby', w: 57, h: 57, weight: 0.4, amps: 0,   svg: gmeter },

  // Autopilot
  { id: 'gmc507', name: 'Garmin GMC 507 (AP control)', category: 'Autopilot', w: 159, h: 53, weight: 0.68, amps: 0.2, svg: gmc507, link: L.gmc507, vendor: SPRUCE },
  { id: 'trio',   name: 'Trio Pro Pilot (autopilot)',  category: 'Autopilot', w: BZ, h: BZ, weight: 4.1, amps: 0.5, svg: trio, link: L.trio, vendor: 'Trio Avionics' },
  { id: 'dynonap', name: 'Dynon SV-AP-PANEL',          category: 'Autopilot', w: 90, h: 46, weight: 0.3, amps: 0.15, svg: dynonAPp, link: L.dynonap, vendor: SPRUCE },

  // Switches & controls (generic / idealized — amps are 0; they pass power, not draw it)
  { id: 'sw-toggle', name: 'Toggle switch',          category: 'Switches & Controls', w: 13, h: 20, weight: 0.05, amps: 0,   svg: swToggle },
  { id: 'sw-rocker', name: 'Rocker switch',          category: 'Switches & Controls', w: 13, h: 18, weight: 0.05, amps: 0,   svg: swRocker },
  { id: 'sw-split',  name: 'Master/Alt split rocker', category: 'Switches & Controls', w: 22, h: 20, weight: 0.1,  amps: 0,   svg: swSplit },
  { id: 'sw-mag',    name: 'Magneto / ignition switch', category: 'Switches & Controls', w: 30, h: 30, weight: 0.2, amps: 0,  svg: swMag },
  { id: 'btn-start', name: 'Starter button',         category: 'Switches & Controls', w: 20, h: 20, weight: 0.05, amps: 0,   svg: btnStart },
  { id: 'cb',        name: 'Circuit breaker',        category: 'Switches & Controls', w: 11, h: 15, weight: 0.05, amps: 0,   svg: cb5 },
  { id: 'knob-dim',  name: 'Dimmer / rheostat knob', category: 'Switches & Controls', w: 20, h: 20, weight: 0.08, amps: 0,   svg: knobDim },
  { id: 'usb',       name: 'USB charge port (dual)', category: 'Switches & Controls', w: 30, h: 14, weight: 0.15, amps: 0,   svg: usb2 },

  // Vents & air controls (generic)
  { id: 'vent',      name: 'Eyeball air vent',       category: 'Vents & Air', w: 52, h: 52, weight: 0.15, amps: 0, svg: vent },
  { id: 'ctl-heat',  name: 'Cabin heat control',     category: 'Vents & Air', w: 20, h: 20, weight: 0.1,  amps: 0, svg: ctlHeat },
  { id: 'ctl-air',   name: 'Cabin air control',      category: 'Vents & Air', w: 20, h: 20, weight: 0.1,  amps: 0, svg: ctlAir },

  // Placards & lights (generic; placards/label carry editable `text`)
  { id: 'annun',     name: 'Annunciator cluster',    category: 'Placards & Lights', w: 64, h: 16, weight: 0.15, amps: 0.1, svg: annun },
  { id: 'label',     name: 'Label (custom text)',    category: 'Placards & Lights', w: 48, h: 11, weight: 0.02, amps: 0,   svg: labelTag, text: 'LABEL' },
  { id: 'placard-n', name: 'N-number placard',       category: 'Placards & Lights', w: 70, h: 16, weight: 0.02, amps: 0,   svg: placardN, text: 'N1234' },
  { id: 'placard-x', name: 'Experimental placard',   category: 'Placards & Lights', w: 56, h: 12, weight: 0.02, amps: 0,   svg: placardX, text: 'EXPERIMENTAL' },

  // Glass displays (all real)
  { id: 'gdu460', name: 'Garmin G3X — GDU 460 (10″)',          category: 'Glass Displays', w: 275.5, h: 198.6, weight: 4.6,  amps: 1.8, svg: gdu460, link: L.g3x, vendor: SPRUCE },
  { id: 'gdu450', name: 'Garmin G3X — GDU 450 (7″ landscape)', category: 'Glass Displays', w: 198.6, h: 152.7, weight: 2.69, amps: 1.3, svg: gdu450, link: L.g3x, vendor: SPRUCE },
  { id: 'gdu470', name: 'Garmin G3X — GDU 470 (7″ portrait)',  category: 'Glass Displays', w: 152.7, h: 198.6, weight: 2.66, amps: 1.3, svg: gdu470, link: L.g3x, vendor: SPRUCE },
  { id: 'hdx1100', name: 'Dynon SkyView HDX (10″)',            category: 'Glass Displays', w: 264, h: 172, weight: 3.6, amps: 2.0, svg: dynonHDX1100, link: L.hdx, vendor: SPRUCE },
  { id: 'hdx800',  name: 'Dynon SkyView HDX (7″)',             category: 'Glass Displays', w: 194, h: 142, weight: 2.0, amps: 1.4, svg: dynonHDX800,  link: L.hdx, vendor: SPRUCE },
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
