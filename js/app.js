// Bootstrap + wiring. Pulls the panel SVG, builds the palette, and connects the
// stage, placement, design repository, inspector, and PNG export.

(function () {
const { Stage, PANEL_VIEWBOX: P, Placement, DesignRepo, blankDesign,
        CATALOG, CATALOG_BY_ID, thumbSVG, exportPNG } = APP;

const $ = (sel) => document.querySelector(sel);
const PANEL_CENTER = { x: P.x + P.w / 2, y: P.y + P.h * 0.32 }; // upper-centre drop point

const repo = new DesignRepo();
let stage, placement;
let current = null;     // active design object
let dirty = false;

async function init() {
  stage = new Stage($('#stage-host'));
  placement = new Placement(stage);

  // Load the blank panel from the inlined data (works from file:// too).
  try {
    if (!APP.PANEL_SVG) throw new Error('panel data not loaded');
    stage.loadPanel(APP.PANEL_SVG);
  } catch (e) {
    toast('Could not load panel SVG (' + e.message + ')');
  }

  wireStage();
  wirePlacement();
  wirePalette();
  buildPalette();
  wireTopbar();
  wireInspector();
  wireVspeeds();
  wireToolbar();
  wireKeyboard();

  bootDesign();

  // Debug/console handle (also handy for scripting from DevTools).
  window.RV8 = { stage, placement, repo, exportPNG, get current() { return current; }, save: saveDesign };
}

/* ----------------------------- stage / placement ------------------------- */
function wireStage() {
  stage.onZoom = (pct) => { $('#zoom-readout').textContent = pct + '%'; };
  stage.onHover = (mm) => {
    $('#hover-coords').textContent = mm
      ? `x ${mm.x.toFixed(0)}  y ${mm.y.toFixed(0)} mm` : '—';
  };
  stage.onBackgroundClick = () => placement.clearSelection();
}

function wirePlacement() {
  placement.onChange = () => { markDirty(true); updateSummary(); };
  placement.onSelect = (it) => renderSelection(it);
}

/* --------------------------------- palette ------------------------------- */
function buildPalette() {
  const host = $('#palette-list');
  const cats = [];
  for (const inst of CATALOG) {
    let c = cats.find(c => c.name === inst.category);
    if (!c) cats.push(c = { name: inst.category, items: [] });
    c.items.push(inst);
  }

  host.replaceChildren();
  for (const cat of cats) {
    const wrap = document.createElement('div');
    wrap.className = 'palette-cat';
    const full = cat.name === 'Glass Displays' || cat.name === 'Nav / Comm / Transponder';
    wrap.innerHTML = `<h3>${cat.name}</h3><div class="palette-grid">${
      cat.items.map(inst => `
        <div class="palette-item${full ? ' full' : ''}" data-id="${inst.id}" title="${inst.name}">
          ${inst.link ? '<span class="buy-badge" title="Real product — purchase link in the inspector">↗</span>' : ''}
          <div class="palette-thumb">${thumbSVG(inst)}</div>
          <div class="palette-name">${inst.name}</div>
          <div class="palette-dims">${fmtDims(inst)}</div>
        </div>`).join('')
    }</div>`;
    host.append(wrap);
  }
  applyPaletteFilter();
}

// Delegated palette listeners — wired once, survive buildPalette() re-renders.
function wirePalette() {
  const host = $('#palette-list');
  host.addEventListener('pointerdown', (e) => {
    const item = e.target.closest('.palette-item');
    if (!item || e.button !== 0) return;
    startPaletteDrag(CATALOG_BY_ID[item.dataset.id], e);
  });
  $('#palette-search').addEventListener('input', applyPaletteFilter);
}

function applyPaletteFilter() {
  const q = $('#palette-search').value.trim().toLowerCase();
  $('#palette-list').querySelectorAll('.palette-item').forEach(el => {
    const inst = CATALOG_BY_ID[el.dataset.id];
    el.style.display = inst.name.toLowerCase().includes(q) ? '' : 'none';
  });
}

function fmtDims(inst) {
  const mm = (n) => Math.round(n);
  const size = inst.w === inst.h ? `Ø ${mm(inst.w)} mm` : `${mm(inst.w)}×${mm(inst.h)} mm`;
  return `${size} · ${inst.weight} lb`;
}

function startPaletteDrag(inst, e) {
  const ghost = document.createElement('div');
  ghost.id = 'drag-ghost';
  // size the ghost to match true scale at the current zoom
  const r = stage.host.getBoundingClientRect();
  const pxPerMM = r.width / stage.vb.w;
  const w = inst.w * pxPerMM, h = inst.h * pxPerMM;
  ghost.innerHTML = `<svg width="${w}" height="${h}" viewBox="${-inst.w/2} ${-inst.h/2} ${inst.w} ${inst.h}" xmlns="http://www.w3.org/2000/svg">${inst.svg()}</svg>`;
  ghost.style.left = e.clientX + 'px';
  ghost.style.top = e.clientY + 'px';
  document.body.append(ghost);

  let moved = false;
  const move = (ev) => {
    moved = true;
    ghost.style.left = ev.clientX + 'px';
    ghost.style.top = ev.clientY + 'px';
  };
  const up = (ev) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    ghost.remove();
    const overStage = stage.host.contains(document.elementFromPoint(ev.clientX, ev.clientY));
    if (moved && overStage) {
      const mm = stage.clientToMM(ev.clientX, ev.clientY);
      placement.add(inst.id, mm.x, mm.y);
    } else if (!moved) {
      placement.add(inst.id, PANEL_CENTER.x, PANEL_CENTER.y); // click = drop at centre
    }
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

/* --------------------------------- topbar -------------------------------- */
function wireTopbar() {
  $('#design-name').addEventListener('input', () => markDirty(true));
  $('#btn-new').addEventListener('click', newDesign);
  $('#btn-save').addEventListener('click', saveDesign);
  $('#btn-export-png').addEventListener('click', () => {
    exportPNG(stage, $('#design-name').value || 'Untitled design')
      .then(() => toast('PNG exported'))
      .catch(err => toast('Export failed: ' + err.message));
  });

  // more menu
  const menu = $('#more-menu');
  $('#btn-more').addEventListener('click', (e) => {
    e.stopPropagation(); menu.hidden = !menu.hidden;
  });
  document.addEventListener('click', () => { menu.hidden = true; });
  menu.addEventListener('click', (e) => e.stopPropagation());

  $('#btn-export-json').addEventListener('click', () => { menu.hidden = true; exportJSON(); });
  $('#btn-import-json').addEventListener('click', () => { menu.hidden = true; $('#file-import').click(); });
  $('#btn-duplicate-design').addEventListener('click', () => { menu.hidden = true; duplicateDesign(); });
  $('#btn-delete-design').addEventListener('click', () => { menu.hidden = true; deleteDesign(); });

  $('#file-import').addEventListener('change', importJSONFile);
}

/* -------------------------------- inspector ------------------------------ */
function wireInspector() {
  $('#design-notes').addEventListener('input', () => markDirty(true));

  $('#sel-x').addEventListener('change', (e) =>
    placement.setSelectedPos(parseFloat(e.target.value), NaN));
  $('#sel-y').addEventListener('change', (e) =>
    placement.setSelectedPos(NaN, parseFloat(e.target.value)));

  $('#btn-front').addEventListener('click', () => placement.bringToFront());
  $('#btn-back').addEventListener('click', () => placement.sendToBack());
  $('#btn-dupe').addEventListener('click', () => placement.duplicateSelected());
  $('#btn-delete-inst').addEventListener('click', () => placement.deleteSelected());
}

function renderSelection(it) {
  const sec = $('#selection-section');
  if (!it) { sec.hidden = true; return; }
  sec.hidden = false;
  const inst = CATALOG_BY_ID[it.instId];
  $('#selection-name').textContent = inst ? `${inst.name} · ${inst.weight} lb` : it.instId;
  $('#sel-x').value = Math.round(it.x);
  $('#sel-y').value = Math.round(it.y);

  const link = $('#selection-link');
  if (inst && inst.link) {
    link.href = inst.link;
    link.textContent = `View / buy at ${inst.vendor || 'vendor'} ↗`;
    link.hidden = false;
  } else {
    link.hidden = true;
  }
}

// Running tally of placed-instrument count and total weight.
function updateSummary() {
  const items = placement.items;
  const w = items.reduce((s, it) => s + (CATALOG_BY_ID[it.instId]?.weight || 0), 0);
  $('#panel-summary').textContent =
    `${items.length} item${items.length === 1 ? '' : 's'} · ≈ ${w.toFixed(1)} lb`;
}

/* ------------------------------- V-speeds -------------------------------- */
const VS_FIELDS = { vs0: '#vs-vs0', vfe: '#vs-vfe', vs1: '#vs-vs1', vno: '#vs-vno', vne: '#vs-vne', scaleMax: '#vs-max' };

function wireVspeeds() {
  for (const sel of Object.values(VS_FIELDS)) $(sel).addEventListener('input', onVspeedInput);
  $('#vs-unit').addEventListener('change', () => {
    const preset = APP.ASI_PRESETS[$('#vs-unit').value] || APP.ASI_PRESETS.mph;
    current.vspeeds = { ...preset };
    fillVspeedsUI(current.vspeeds);
    applyVspeeds(current.vspeeds);
    markDirty(true);
  });
}

function onVspeedInput() {
  const vs = current.vspeeds;
  for (const [k, sel] of Object.entries(VS_FIELDS)) {
    const v = parseFloat($(sel).value);
    if (Number.isFinite(v)) vs[k] = v;
  }
  applyVspeeds(vs);
  markDirty(true);
}

function fillVspeedsUI(vs) {
  $('#vs-unit').value = (vs.unit === 'KNOTS' || vs.unit === 'kt') ? 'kt' : 'mph';
  for (const [k, sel] of Object.entries(VS_FIELDS)) $(sel).value = vs[k];
}

// Push V-speeds into the ASI renderer and refresh anything showing one.
function applyVspeeds(vs) {
  APP.setASIConfig(vs);
  buildPalette();        // ASI thumbnail
  placement.refresh();   // placed ASIs
}

/* -------------------------------- toolbar -------------------------------- */
function wireToolbar() {
  $('#btn-zoom-in').addEventListener('click', () => stage.zoomCenter(1.25));
  $('#btn-zoom-out').addEventListener('click', () => stage.zoomCenter(1 / 1.25));
  $('#btn-zoom-fit').addEventListener('click', () => stage.fit());
  $('#toggle-grid').addEventListener('change', (e) => stage.setGrid(e.target.checked));
  window.addEventListener('resize', () => stage.fit());
}

/* ------------------------------- keyboard -------------------------------- */
function wireKeyboard() {
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) {
      if (e.key === 'Escape') t.blur();
      return;
    }
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 's') { e.preventDefault(); saveDesign(); return; }
    if (meta && e.key.toLowerCase() === 'd') { e.preventDefault(); placement.duplicateSelected(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); placement.deleteSelected(); return; }
    if (e.key === 'Escape') { placement.clearSelection(); return; }
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); placement.nudgeSelected(-step, 0); }
    if (e.key === 'ArrowRight') { e.preventDefault(); placement.nudgeSelected(step, 0); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); placement.nudgeSelected(0, -step); }
    if (e.key === 'ArrowDown')  { e.preventDefault(); placement.nudgeSelected(0, step); }
  });
}

/* ----------------------------- design lifecycle -------------------------- */
function bootDesign() {
  const all = repo.loadAll();
  const activeId = repo.getActiveId();
  const found = activeId && all.find(d => d.id === activeId);
  if (found) loadDesign(found);
  else if (all.length) loadDesign(all[0]);
  else { current = repo.upsert(blankDesign()); repo.setActiveId(current.id); applyDesign(current); }
  renderDesignsList();
}

function applyDesign(d) {
  d.vspeeds = d.vspeeds || { ...APP.ASI_PRESETS.mph };
  $('#design-name').value = d.name;
  $('#design-notes').value = d.notes || '';
  fillVspeedsUI(d.vspeeds);
  APP.setASIConfig(d.vspeeds);   // before instruments render
  buildPalette();                // ASI thumbnail reflects this design
  placement.setItems(d.instruments);
  updateSummary();
  markDirty(false);
}

function loadDesign(d) {
  if (!confirmDiscard()) return;
  current = d;
  repo.setActiveId(d.id);
  applyDesign(d);
  renderDesignsList();
}

function collectInto(d) {
  d.name = $('#design-name').value.trim() || 'Untitled design';
  d.notes = $('#design-notes').value;
  d.instruments = placement.serialize();
  return d;
}

function saveDesign() {
  collectInto(current);
  repo.upsert(current);
  repo.setActiveId(current.id);
  markDirty(false);
  renderDesignsList();
  toast('Saved “' + current.name + '”');
}

function newDesign() {
  if (!confirmDiscard()) return;
  current = repo.upsert(blankDesign());
  repo.setActiveId(current.id);
  applyDesign(current);
  renderDesignsList();
  $('#design-name').focus();
}

function duplicateDesign() {
  const copy = blankDesign(collectInto(current).name + ' copy');
  copy.notes = current.notes;
  copy.instruments = JSON.parse(JSON.stringify(current.instruments));
  current = repo.upsert(copy);
  repo.setActiveId(current.id);
  applyDesign(current);
  renderDesignsList();
  toast('Duplicated');
}

function deleteDesign() {
  if (!confirm('Delete “' + current.name + '”? This cannot be undone.')) return;
  repo.remove(current.id);
  const all = repo.loadAll();
  if (all.length) loadDesign(all[0]);
  else { current = repo.upsert(blankDesign()); repo.setActiveId(current.id); applyDesign(current); }
  renderDesignsList();
  toast('Deleted');
}

function renderDesignsList() {
  const all = repo.loadAll().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const list = $('#designs-list');
  $('#design-count').textContent = all.length ? `${all.length}` : '';
  if (!all.length) { list.innerHTML = `<li class="designs-empty">No saved designs yet.</li>`; return; }
  list.replaceChildren();
  for (const d of all) {
    const li = document.createElement('li');
    li.className = 'design-row' + (d.id === current?.id ? ' active' : '');
    li.innerHTML = `<span class="d-name">${escapeHTML(d.name)}</span>
      <span class="d-meta">${d.instruments.length} · ${fmtDate(d.updatedAt)}</span>`;
    li.addEventListener('click', () => { if (d.id !== current?.id) loadDesign(d); });
    list.append(li);
  }
}

/* ------------------------------- JSON I/O -------------------------------- */
function exportJSON() {
  collectInto(current);
  const blob = new Blob([repo.toJSON(current)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (current.name || 'rv8-panel').replace(/[^\w\-]+/g, '_') + '.json';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('JSON exported');
}

function importJSONFile(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = repo.fromJSON(reader.result);
      current = repo.upsert(d);
      repo.setActiveId(current.id);
      applyDesign(current);
      renderDesignsList();
      toast('Imported “' + current.name + '”');
    } catch (err) {
      toast('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
}

/* -------------------------------- helpers -------------------------------- */
function markDirty(v) {
  dirty = v;
  $('#dirty-dot').hidden = !v;
}

function confirmDiscard() {
  if (!dirty) return true;
  return confirm('You have unsaved changes. Discard them?');
}

function fmtDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  catch { return ''; }
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

let toastTimer;
function toast(msg) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.append(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// Kick everything off (after all declarations above are initialized).
init();
})();
