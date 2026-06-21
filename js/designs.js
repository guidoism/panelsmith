// Design persistence. localStorage-backed today, but everything goes through
// this small repository interface so a backend (multi-user, many aircraft) can
// be dropped in later without touching the UI.

(function () {
const KEY_DESIGNS = 'rv8-panel-designs';
const KEY_ACTIVE = 'rv8-panel-active';
const SCHEMA = 1;

function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'd-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function blankDesign(name = 'Untitled design') {
  const now = new Date().toISOString();
  return {
    schema: SCHEMA, aircraft: 'RV-8',
    id: uid(), name, notes: '',
    createdAt: now, updatedAt: now,
    instruments: [],
  };
}

class DesignRepo {
  loadAll() {
    try {
      const raw = localStorage.getItem(KEY_DESIGNS);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  _saveAll(arr) { localStorage.setItem(KEY_DESIGNS, JSON.stringify(arr)); }

  get(id) { return this.loadAll().find(d => d.id === id) || null; }

  // Insert or update; stamps updatedAt. Returns the stored design.
  upsert(design) {
    const arr = this.loadAll();
    design.updatedAt = new Date().toISOString();
    const i = arr.findIndex(d => d.id === design.id);
    if (i >= 0) arr[i] = design; else arr.push(design);
    this._saveAll(arr);
    return design;
  }

  remove(id) {
    this._saveAll(this.loadAll().filter(d => d.id !== id));
    if (this.getActiveId() === id) this.setActiveId(null);
  }

  getActiveId() { return localStorage.getItem(KEY_ACTIVE); }
  setActiveId(id) {
    if (id) localStorage.setItem(KEY_ACTIVE, id);
    else localStorage.removeItem(KEY_ACTIVE);
  }

  // ---- JSON export / import ----------------------------------------------
  toJSON(design) { return JSON.stringify(design, null, 2); }

  // Parse an imported design; assigns a fresh id to avoid clobbering.
  fromJSON(text) {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.instruments)) {
      throw new Error('Not a valid panel design file');
    }
    const now = new Date().toISOString();
    return {
      schema: SCHEMA, aircraft: obj.aircraft || 'RV-8',
      id: uid(),
      name: (obj.name || 'Imported design') + (this.get(obj.id) ? '' : ''),
      notes: obj.notes || '',
      createdAt: obj.createdAt || now, updatedAt: now,
      instruments: obj.instruments.map(it => ({
        instId: it.instId,
        x_mm: Number(it.x_mm ?? it.x ?? 0),
        y_mm: Number(it.y_mm ?? it.y ?? 0),
      })),
    };
  }
}

APP.blankDesign = blankDesign;
APP.DesignRepo = DesignRepo;
})();
