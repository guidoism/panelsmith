# CLAUDE.md — working notes for AI agents

Operational guide for AI coding agents (and humans using them) working in this repo. For
the project's values, see [Philosophy](README.md#philosophy); for contribution mechanics,
see [CONTRIBUTING.md](CONTRIBUTING.md).

## What this is

Panelsmith — a no-build, browser-based tool for laying out aircraft instrument panels at
true millimetre scale. Pure static site.

**Run:** double-click `index.html` (works from `file://`), or `python3 -m http.server`
then open the printed URL.

## Architecture map

| File | Role |
|------|------|
| `index.html` | 3-pane layout (palette · stage · inspector); loads the classic scripts in order |
| `styles/app.css` | All styling |
| `js/panel-data.js` | The blank panel SVG, inlined as a string on `APP.PANEL_SVG` |
| `js/instruments.js` | Instrument `CATALOG` + pure-SVG factories + shared gradient `DEFS` |
| `js/missions.js` | `MISSIONS`, `ARCHITECTURES` (Z-figures), capability map + pure `evaluateMission()` |
| `js/stage.js` | `Stage`: loads the panel, mm-coordinate canvas, pan/zoom/grid, alignment guides |
| `js/placement.js` | `Placement`: add/drag/select/delete/order instruments; snapping (`computeSnap`) |
| `js/designs.js` | `DesignRepo`: localStorage CRUD + JSON import/export; `blankDesign` (includes `vspeeds`, `mission`, `architecture`) |
| `js/export-png.js` | Serialize the stage SVG → canvas → PNG |
| `js/app.js` | Wires palette, inspector, toolbar, keyboard, V-speeds, design lifecycle |

Scripts share a single global **`APP`** namespace: each file is an IIFE that reads its
dependencies off `APP` and attaches its exports back onto it. `index.html` loads them in
dependency order (`panel-data` → `font-data` → `instruments` → `missions` → `designs` →
`stage` → `placement` → `export-png` → `app`).

## Hard invariants — do not break these

1. **No build step.** Plain HTML/CSS + **classic** `<script>` files (NOT ES modules — no
   `import`/`export`). This is what lets it run from `file://`. Don't add npm, a bundler,
   a framework, or any runtime dependency.
2. **Millimetres everywhere.** The stage works in real mm; the panel SVG viewBox defines
   the coordinate space. Instruments are drawn at true mm size centered on the origin.
3. **One self-contained stage SVG.** Shared gradients live in a single `<defs>` (from
   `APP.INSTRUMENT_DEFS`); PNG export just clones + serializes that SVG. Keep it
   self-contained (no external image refs).
4. **Panel art is inlined.** The app reads `APP.PANEL_SVG`, never `fetch`. If you change
   `rv-8-panel-blank.svg`, regenerate `js/panel-data.js` (command in the README). Keep
   `rv-8-panel-blank.svg` a **real file** (not a symlink) and keep **`.nojekyll`** present
   — both are required for the GitHub Pages deploy. The blank panel is **not hand-drawn**;
   it's derived from Van's official CAD — see "Where the panel art comes from" below
   before touching it.
5. **Instruments are pure SVG**, centered on origin, true mm `w`/`h`, with a `weight` (lb)
   and a `sel-outline` rect. Real, buyable units add `link` + `vendor` with sourced specs.

## Where the panel art comes from

`rv-8-panel-blank.svg` is **derived from Van's official CAD**, not drawn by hand. The
full, reproducible pipeline is recorded in **[`NOTES.md`](NOTES.md)** — read it before
regenerating or editing the panel. The short version:

- Source is Van's `RV-8_2D_Panel.dxf` (and `RV-8 3D Panel.IGS` for the 3D fit-check work).
  The DXF holds four pieces in a 2×2 grid; we use the **bottom row** (the post-9/06
  fully-prepunched "PP" panel) — left column = main panel, right column = side/shroud
  piece.
- DXF → SVG is done headless with FreeCAD's Draft module (Inkscape/QCAD CLIs don't work on
  this DXF — see NOTES.md for why). Y is flipped (DXF is y-up, SVG y-down) and dimensions
  are emitted in **real mm** so the SVG is 1:1 printable — which is also what gives the
  app its mm coordinate space.
- **Rivet holes are how the pieces line up.** The side piece overlaps the main panel
  substantially (it does *not* butt against it). The assembled offset is found by matching
  hole patterns: collect every circle from both pieces, pair holes whose radius matches
  within 0.01 mm and y within 0.1 mm, and take the most common `dx`. For the RV-8 PP panel
  that shift is **−508 mm (≈20")**, corroborated by 6 hole-pair matches. The left side is
  the right side mirrored about its own vertical centre, then placed symmetrically.

If you ever re-composite or swap in a different airframe's panel, follow that
hole-matching method rather than eyeballing the seams, and update NOTES.md with the new
numbers.

## Verify

```sh
node --check js/*.js
```

Then open `index.html`, place instruments, and Export PNG. For automated checks, headless
Chrome with `--remote-debugging-port` + a small CDP script can place instruments and
screenshot (the app exposes a `window.RV8` debug handle: `stage`, `placement`, `repo`,
`exportPNG`, `current`).
