# RV-8 Instrument Panel Designer

A no-build, browser-based tool for mocking up RV-8 avionics panel layouts. Drag scaled
instruments onto the true-scale blank panel, jot notes, name the design, keep many designs
side by side, and export a composited PNG.

## Run

No build step. **Just double-click `index.html`** — it runs straight from the filesystem
(`file://`). Or, if you prefer, serve the folder:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

The app uses plain classic scripts (not ES modules) and an inlined copy of the panel so it
works without a server.

## How it works

The blank panel (`rv-8-panel-blank.svg`, symlinked from the Dropbox mockups folder) uses a
**viewBox in real millimetres**, so the whole canvas works in mm. Every instrument is
drawn at its true mm size, which means scale is correct against the panel by construction
— no per-asset calibration.

- **Left palette** — instruments grouped by category. Drag onto the panel, or click to
  drop at the upper-centre.
- **Stage** — pan (drag empty space / middle-drag / space-drag), zoom (wheel or the
  toolbar), optional 50 mm grid. Select an instrument to drag it; arrow keys nudge (Shift
  = 10 mm).
- **Right inspector** — design name + notes, selected-instrument X/Y and
  front/back/duplicate/delete, and the list of saved designs.

Shortcuts: `⌘/Ctrl+S` save · `⌘/Ctrl+D` duplicate · `Delete`/`Backspace` remove · arrows
nudge · `Esc` deselect.

## Instruments

- **3⅛″ rounds** (idealized, parametric SVG): Attitude, Directional Gyro, Airspeed,
  Altimeter, Vertical Speed, Turn Coordinator — ~84 mm bezels.
- **Garmin G3X Touch glass** (real bezel sizes, faithful PFD/MFD layout in SVG): GDU 460
  (10″, 275.5 × 198.6 mm) and GDU 470 (7″, 152.7 × 198.6 mm).

## Storage & export

- Designs persist in browser **localStorage**. Use the **⋯** menu to export or import a
  design as JSON for backup/sharing.
- **Export PNG** flattens the panel + instruments + design title to a high-resolution
  image (white background, ~5 px/mm).

## Code map

Each `js/*` file is a classic script wrapped in an IIFE that attaches its public pieces to
a shared `APP` global; `index.html` loads them in dependency order.

| File | Responsibility |
|------|----------------|
| `js/panel-data.js` | The blank panel SVG, inlined as a string (so no `fetch`) |
| `js/instruments.js` | Instrument catalog; true-mm SVG factories |
| `js/stage.js` | Loads the panel SVG; mm-coordinate stage; pan/zoom/grid |
| `js/placement.js` | Place / drag / select / order instrument instances |
| `js/designs.js` | localStorage repository + JSON import/export |
| `js/export-png.js` | Serialize stage SVG → canvas → PNG |
| `js/app.js` | Wires palette, inspector, toolbar, keyboard, lifecycle |

If you edit the blank panel SVG, regenerate the inlined copy:

```sh
node -e 'const fs=require("fs");fs.writeFileSync("js/panel-data.js","window.APP = window.APP || {};\nAPP.PANEL_SVG = "+JSON.stringify(fs.readFileSync("rv-8-panel-blank.svg","utf8"))+";\n")'
```

## Ideas for later

- 3D fit-check using `RV-8_Panel.stl` plus per-instrument protrusion depth, to see how
  units pack into the avionics bay (see `NOTES.md` for the conversion pipeline).
- More instruments (2¼″ rounds, switches, breakers, radios) and real product-specific
  variants behind each idealized round.
- Multiple aircraft models / multi-user — the `designs.js` repository interface is kept
  backend-swappable for this.
