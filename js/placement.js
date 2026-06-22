// Manages instrument instances placed on the stage: render, drag, select,
// delete, duplicate, z-order. Positions are the instrument CENTRE in panel mm.

(function () {
const { CATALOG_BY_ID } = APP;

const SVGNS = 'http://www.w3.org/2000/svg';

class Placement {
  constructor(stage) {
    this.stage = stage;
    this.items = [];          // [{ uid, instId, x, y }] in z-order (last = top)
    this.selected = null;     // uid
    this._uidSeq = 1;
    this.onChange = null;     // () => void  (mark dirty)
    this.onSelect = null;     // (item|null) => void
  }

  _uid() { return 'i' + (this._uidSeq++); }

  // ---- model <-> view ----------------------------------------------------
  setItems(items) {
    this.items = (items || []).map(it => ({
      uid: this._uid(),
      instId: it.instId,
      x: it.x_mm ?? it.x ?? 0,
      y: it.y_mm ?? it.y ?? 0,
      bus: it.bus || 'main',
      text: it.text,
    }));
    this.selected = null;
    this._renderAll();
    if (this.onSelect) this.onSelect(null);
  }

  serialize() {
    return this.items.map(it => ({
      instId: it.instId, x_mm: Math.round(it.x), y_mm: Math.round(it.y), bus: it.bus || 'main',
      ...(it.text !== undefined ? { text: it.text } : {}),
    }));
  }

  _renderAll() {
    this.stage.instLayer.replaceChildren();
    for (const it of this.items) this.stage.instLayer.append(this._buildNode(it));
    this._refreshSelectionClass();
  }

  _buildNode(it) {
    const inst = CATALOG_BY_ID[it.instId];
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'instrument');
    g.setAttribute('data-uid', it.uid);
    g.setAttribute('transform', `translate(${it.x} ${it.y})`);
    if (!inst) {
      g.innerHTML = `<rect x="-20" y="-20" width="40" height="40" fill="#822" />`;
      return g;
    }
    // transparent hit area covering full bounds so the whole unit is draggable
    const hit = `<rect class="hit" x="${-inst.w/2}" y="${-inst.h/2}" width="${inst.w}" height="${inst.h}"/>`;
    g.innerHTML = inst.svg(it.text) + hit;
    this._wireDrag(g, it);
    return g;
  }

  _node(uid) { return this.stage.instLayer.querySelector(`[data-uid="${uid}"]`); }

  // ---- interaction -------------------------------------------------------
  _wireDrag(g, it) {
    let drag = null;
    g.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();               // don't let the stage start a pan
      this.select(it.uid);
      const start = this.stage.clientToMM(e.clientX, e.clientY);
      drag = { sx: start.x, sy: start.y, ix: it.x, iy: it.y, moved: false };
      g.setPointerCapture(e.pointerId);
    });
    g.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const p = this.stage.clientToMM(e.clientX, e.clientY);
      const rawX = drag.ix + (p.x - drag.sx);
      const rawY = drag.iy + (p.y - drag.sy);
      // Hold Alt to bypass snapping for fine free placement.
      const snap = e.altKey ? { x: rawX, y: rawY, snappedX: false, snappedY: false, guides: [] }
                            : this.computeSnap(it, rawX, rawY);
      it.x = snap.snappedX ? snap.x : Math.round(rawX);
      it.y = snap.snappedY ? snap.y : Math.round(rawY);
      g.setAttribute('transform', `translate(${it.x} ${it.y})`);
      this.stage.showGuides(snap.guides);
      drag.moved = true;
      if (this.onSelect) this.onSelect(it);   // live coord readout
    });
    const end = (e) => {
      if (!drag) return;
      if (drag.moved && this.onChange) this.onChange();
      drag = null;
      this.stage.clearGuides();
      try { g.releasePointerCapture(e.pointerId); } catch {}
    };
    g.addEventListener('pointerup', end);
    g.addEventListener('pointercancel', end);
  }

  // Smart alignment: snap the dragged item's edges/centre to other items and
  // the panel centre lines, returning the snapped position + guide lines to draw.
  computeSnap(item, rawX, rawY) {
    const inst = CATALOG_BY_ID[item.instId];
    const hw = inst.w / 2, hh = inst.h / 2;
    const thr = this.stage.mmPerPx() * 7;        // ~7px tolerance, zoom-independent
    const PV = APP.PANEL_VIEWBOX;
    const panelCx = PV.x + PV.w / 2, panelCy = PV.y + PV.h / 2;

    const ax = [rawX - hw, rawX, rawX + hw];     // left, centre, right
    const ay = [rawY - hh, rawY, rawY + hh];     // top, centre, bottom

    const xt = [{ pos: panelCx, lo: PV.y, hi: PV.y + PV.h, full: true }];
    const yt = [{ pos: panelCy, lo: PV.x, hi: PV.x + PV.w, full: true }];
    for (const o of this.items) {
      if (o === item) continue;
      const oi = CATALOG_BY_ID[o.instId], ohw = oi.w / 2, ohh = oi.h / 2;
      for (const px of [o.x - ohw, o.x, o.x + ohw]) xt.push({ pos: px, lo: o.y - ohh, hi: o.y + ohh });
      for (const py of [o.y - ohh, o.y, o.y + ohh]) yt.push({ pos: py, lo: o.x - ohw, hi: o.x + ohw });
    }

    const best = (anchors, targets) => {
      let b = null;
      for (const t of targets) for (const a of anchors) {
        const d = t.pos - a;
        if (Math.abs(d) <= thr && (!b || Math.abs(d) < Math.abs(b.delta))) b = { delta: d, target: t };
      }
      return b;
    };

    const bx = best(ax, xt), by = best(ay, yt);
    const x = bx ? rawX + bx.delta : rawX;
    const y = by ? rawY + by.delta : rawY;

    const guides = [];
    if (bx) {
      const lo = bx.target.full ? bx.target.lo : Math.min(bx.target.lo, y - hh);
      const hi = bx.target.full ? bx.target.hi : Math.max(bx.target.hi, y + hh);
      guides.push({ x1: bx.target.pos, y1: lo, x2: bx.target.pos, y2: hi });
    }
    if (by) {
      const lo = by.target.full ? by.target.lo : Math.min(by.target.lo, x - hw);
      const hi = by.target.full ? by.target.hi : Math.max(by.target.hi, x + hw);
      guides.push({ x1: lo, y1: by.target.pos, x2: hi, y2: by.target.pos });
    }
    return { x, y, snappedX: !!bx, snappedY: !!by, guides };
  }

  refresh() { this._renderAll(); }

  // ---- commands ----------------------------------------------------------
  add(instId, x, y, bus = 'main') {
    const it = { uid: this._uid(), instId, x: Math.round(x), y: Math.round(y), bus };
    this.items.push(it);
    this.stage.instLayer.append(this._buildNode(it));
    this.select(it.uid);
    if (this.onChange) this.onChange();
    return it;
  }

  select(uid) {
    this.selected = uid;
    this._refreshSelectionClass();
    const it = this.items.find(i => i.uid === uid) || null;
    if (this.onSelect) this.onSelect(it);
  }

  clearSelection() {
    this.selected = null;
    this._refreshSelectionClass();
    if (this.onSelect) this.onSelect(null);
  }

  _refreshSelectionClass() {
    for (const node of this.stage.instLayer.children) {
      node.classList.toggle('selected', node.getAttribute('data-uid') === this.selected);
    }
  }

  _selectedItem() { return this.items.find(i => i.uid === this.selected) || null; }

  deleteSelected() {
    const it = this._selectedItem(); if (!it) return;
    this.items = this.items.filter(i => i !== it);
    this._node(it.uid)?.remove();
    this.clearSelection();
    if (this.onChange) this.onChange();
  }

  duplicateSelected() {
    const it = this._selectedItem(); if (!it) return;
    const copy = this.add(it.instId, it.x + 12, it.y + 12, it.bus);
    if (it.text !== undefined) { copy.text = it.text; this._rebuildNode(copy); }
  }

  setSelectedBus(bus) {
    const it = this._selectedItem(); if (!it) return;
    it.bus = bus;
    if (this.onChange) this.onChange();
  }

  // Update editable label text on the selected item and re-render its node.
  setSelectedText(text) {
    const it = this._selectedItem(); if (!it) return;
    it.text = text;
    this._rebuildNode(it);
    if (this.onChange) this.onChange();
  }

  _rebuildNode(it) {
    const old = this._node(it.uid);
    if (old) { old.replaceWith(this._buildNode(it)); this._refreshSelectionClass(); }
  }

  setSelectedPos(x, y) {
    const it = this._selectedItem(); if (!it) return;
    if (Number.isFinite(x)) it.x = Math.round(x);
    if (Number.isFinite(y)) it.y = Math.round(y);
    this._node(it.uid)?.setAttribute('transform', `translate(${it.x} ${it.y})`);
    if (this.onChange) this.onChange();
  }

  nudgeSelected(dx, dy) {
    const it = this._selectedItem(); if (!it) return;
    this.setSelectedPos(it.x + dx, it.y + dy);
    if (this.onSelect) this.onSelect(it);
  }

  bringToFront() {
    const it = this._selectedItem(); if (!it) return;
    this.items = this.items.filter(i => i !== it); this.items.push(it);
    const node = this._node(it.uid); if (node) this.stage.instLayer.append(node);
    if (this.onChange) this.onChange();
  }

  sendToBack() {
    const it = this._selectedItem(); if (!it) return;
    this.items = this.items.filter(i => i !== it); this.items.unshift(it);
    const node = this._node(it.uid);
    if (node) this.stage.instLayer.insertBefore(node, this.stage.instLayer.firstChild);
    if (this.onChange) this.onChange();
  }
}

APP.Placement = Placement;
})();
