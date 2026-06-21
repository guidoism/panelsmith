// The stage: a single SVG working in real panel millimetres. The blank panel
// paths are the background; instruments live in their own layer above. Zoom/pan
// is done by mutating the SVG viewBox, so PNG export can serialize one element.

(function () {
const SVGNS = 'http://www.w3.org/2000/svg';

// Panel viewBox in mm, read from rv-8-panel-blank.svg.
const PANEL_VIEWBOX = { x: -152.51, y: -312.25, w: 895.58, h: 370.40 };

class Stage {
  constructor(host) {
    this.host = host;
    this.vb = { ...PANEL_VIEWBOX };
    this.onHover = null;     // (mm|null) => void
    this.onZoom = null;      // (scalePct) => void
    this.onBackgroundClick = null;
    this._build();
  }

  _build() {
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('xmlns', SVGNS);
    this.svg = svg;

    // Shared instrument gradient/filter defs, injected once.
    const defs = document.createElementNS(SVGNS, 'defs');
    defs.innerHTML = (typeof APP !== 'undefined' && APP.INSTRUMENT_DEFS) || '';

    this.gridLayer = document.createElementNS(SVGNS, 'g');
    this.gridLayer.setAttribute('class', 'grid-lines');
    this.gridLayer.style.display = 'none';

    this.panelLayer = document.createElementNS(SVGNS, 'g');
    this.panelLayer.setAttribute('class', 'panel-bg');

    this.instLayer = document.createElementNS(SVGNS, 'g');
    this.instLayer.setAttribute('class', 'instruments-layer');

    this.guideLayer = document.createElementNS(SVGNS, 'g');
    this.guideLayer.setAttribute('class', 'align-guides');

    svg.append(defs, this.gridLayer, this.panelLayer, this.instLayer, this.guideLayer);
    this.host.append(svg);
    this._applyViewBox();
    this._wirePanZoom();
  }

  // Inject the panel's inner markup (the <g> with all paths).
  loadPanel(svgText) {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const src = doc.querySelector('svg');
    if (!src) throw new Error('Panel SVG could not be parsed');
    this.panelLayer.replaceChildren();
    for (const child of Array.from(src.childNodes)) {
      this.panelLayer.append(document.importNode(child, true));
    }
    this.fit();
  }

  _applyViewBox() {
    const { x, y, w, h } = this.vb;
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    if (this.onZoom) this.onZoom(Math.round(this.scalePct()));
    if (this.gridLayer.style.display !== 'none') this._drawGrid();
  }

  scalePct() {
    const rect = this.host.getBoundingClientRect();
    return (rect.width / this.vb.w) / (rect.width / PANEL_VIEWBOX.w) * 100;
  }

  // mm represented by one screen pixel at the current zoom.
  mmPerPx() { return this.vb.w / (this.host.clientWidth || 1); }

  // Draw alignment guide lines (array of {x1,y1,x2,y2} in mm). Empty = clear.
  showGuides(lines) {
    this.guideLayer.innerHTML = (lines || [])
      .map(l => `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}"/>`).join('');
  }
  clearGuides() { this.guideLayer.innerHTML = ''; }

  fit(pad = 1.06) {
    const rect = this.host.getBoundingClientRect();
    const hostAR = rect.width / rect.height || 1;
    const pw = PANEL_VIEWBOX.w * pad, ph = PANEL_VIEWBOX.h * pad;
    const cx = PANEL_VIEWBOX.x + PANEL_VIEWBOX.w / 2;
    const cy = PANEL_VIEWBOX.y + PANEL_VIEWBOX.h / 2;
    let w = pw, h = ph;
    if (pw / ph > hostAR) h = w / hostAR; else w = h * hostAR;
    this.vb = { x: cx - w / 2, y: cy - h / 2, w, h };
    this._applyViewBox();
  }

  // Convert client (screen) coordinates to mm user coordinates.
  clientToMM(clientX, clientY) {
    const pt = this.svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const m = this.svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  zoomAround(factor, clientX, clientY) {
    const before = this.clientToMM(clientX, clientY);
    let w = this.vb.w / factor;
    w = Math.max(PANEL_VIEWBOX.w / 40, Math.min(PANEL_VIEWBOX.w * 4, w));
    const ratio = w / this.vb.w;
    const h = this.vb.h * ratio;
    this.vb = { x: this.vb.x, y: this.vb.y, w, h };
    this._applyViewBox();
    const after = this.clientToMM(clientX, clientY);
    this.vb.x += before.x - after.x;
    this.vb.y += before.y - after.y;
    this._applyViewBox();
  }

  zoomCenter(factor) {
    const r = this.host.getBoundingClientRect();
    this.zoomAround(factor, r.left + r.width / 2, r.top + r.height / 2);
  }

  setGrid(on) {
    this.gridLayer.style.display = on ? '' : 'none';
    if (on) this._drawGrid();
  }

  _drawGrid() {
    const step = 50; // mm
    const { x, y, w, h } = this.vb;
    const x0 = Math.floor(x / step) * step, x1 = x + w;
    const y0 = Math.floor(y / step) * step, y1 = y + h;
    let out = '';
    for (let gx = x0; gx <= x1; gx += step) {
      const major = gx % 100 === 0;
      out += `<line x1="${gx}" y1="${y0}" x2="${gx}" y2="${y1}" class="${major ? 'major' : ''}"/>`;
    }
    for (let gy = y0; gy <= y1; gy += step) {
      const major = gy % 100 === 0;
      out += `<line x1="${x0}" y1="${gy}" x2="${x1}" y2="${gy}" class="${major ? 'major' : ''}"/>`;
    }
    this.gridLayer.innerHTML = out;
  }

  _wirePanZoom() {
    const host = this.host;

    host.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = Math.pow(1.0015, -e.deltaY);
      this.zoomAround(factor, e.clientX, e.clientY);
    }, { passive: false });

    let panning = false, last = null, spaceDown = false;
    window.addEventListener('keydown', (e) => { if (e.code === 'Space') spaceDown = true; });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space') spaceDown = false; });

    host.addEventListener('pointerdown', (e) => {
      const onInstrument = e.target.closest('.instrument');
      // Pan with middle button, space-drag, or empty-background drag.
      if (e.button === 1 || (e.button === 0 && (spaceDown || !onInstrument))) {
        if (e.button === 0 && !onInstrument && !spaceDown && this.onBackgroundClick) {
          this.onBackgroundClick();
        }
        panning = true;
        last = { x: e.clientX, y: e.clientY };
        host.classList.add('panning');
        host.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });

    host.addEventListener('pointermove', (e) => {
      if (this.onHover) {
        const inside = e.target.closest('svg');
        this.onHover(inside ? this.clientToMM(e.clientX, e.clientY) : null);
      }
      if (!panning) return;
      const scaleX = this.vb.w / host.clientWidth;
      const scaleY = this.vb.h / host.clientHeight;
      this.vb.x -= (e.clientX - last.x) * scaleX;
      this.vb.y -= (e.clientY - last.y) * scaleY;
      last = { x: e.clientX, y: e.clientY };
      this._applyViewBox();
    });

    const endPan = (e) => {
      if (!panning) return;
      panning = false;
      host.classList.remove('panning');
      try { host.releasePointerCapture(e.pointerId); } catch {}
    };
    host.addEventListener('pointerup', endPan);
    host.addEventListener('pointercancel', endPan);
    host.addEventListener('mouseleave', () => { if (this.onHover) this.onHover(null); });
  }
}

APP.Stage = Stage;
APP.PANEL_VIEWBOX = PANEL_VIEWBOX;
})();
