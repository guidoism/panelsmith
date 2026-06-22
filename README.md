# Panelsmith

### ▶ [Launch Panelsmith → guidoism.github.io/panelsmith](https://guidoism.github.io/panelsmith/)

A no-build, browser-based tool for mocking up aircraft avionics panel layouts (starting
with the Van's RV-8). Drag scaled instruments onto the true-scale blank panel, jot notes,
name the design, keep many designs side by side, and export a composited PNG.

## Philosophy

**Fork freely.** Under the [MIT license](LICENSE) you can take Panelsmith anywhere — build
something completely different, even something that rejects everything below. That's the
point of open source, and you need no one's permission. These principles aren't rules for
users or forks; they're simply the taste that guides what gets merged into **this** repo —
the bar a pull request meets to be accepted here:

1. **No build step, ever.** Plain HTML/CSS + classic-script JS; runs from `file://` and
   static hosting. No npm, bundler, framework, or transpiler.
2. **Physically honest.** Real millimetres, true-scale instruments, manufacturer/POH
   weights and V-speeds. Cite sources; don't eyeball dimensions.
3. **Instruments are pure SVG.** Parametric, centered on the origin, drawn in mm — no
   raster images.
4. **Idealized first, real when ready.** Generic instruments for early sketching; real,
   buyable products are a separate tier with purchase links.
5. **Local-first & private.** Browser storage + JSON export; no accounts, servers,
   tracking, or analytics. The storage layer stays backend-swappable, but the default is
   offline and dependency-free.
6. **A pleasure to look at.** Polished, aviation-authentic visuals over generic UI.
7. **Stay small and readable.** Anyone can open a file and understand it; resist features
   that compromise principles 1, 2, or 5.
8. **Respect the brands.** Real product names/links are buyer convenience; the renderings
   are representations, not official assets, and imply no endorsement.

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
- **Smart alignment guides** — while dragging, an instrument's edges and centre snap to
  other instruments and to the panel centreline (~7 px tolerance), drawing magenta guide
  lines. Hold **Alt** to bypass snapping for free placement.
- **Right inspector** — design name + notes, editable **V-speeds** (see below),
  selected-instrument X/Y and front/back/duplicate/delete, and the list of saved designs.

Shortcuts: `⌘/Ctrl+S` save · `⌘/Ctrl+D` duplicate · `Delete`/`Backspace` remove · arrows
nudge · `Alt`-drag free placement · `Esc` deselect.

## Instruments

- **3⅛″ rounds** (idealized, detailed parametric SVG with cast bezel, corner screws, and
  glass reflection): Attitude (sky/ground, pitch ladder, OFF flag), Directional Gyro,
  Airspeed, Altimeter (three-pointer + Kollsman window), Vertical Speed, Turn Coordinator.
- **AoA / Lift** indicators (three styles): Lift Reserve Indicator (2¼″ round needle
  gauge), Alpha Systems "Eagle" chevron + donut display, and a Dynon/Garmin-style LED
  ladder.

Idealized instruments are great for early sketching. When you're ready to spec real
hardware, the **real, buyable** units carry accurate sizes/weights and a purchase link
(shown as a "View / buy at …" link on the selected instrument, and a ↗ badge in the
palette):

- **Electronic Flight Instruments**: Garmin G5, Garmin GI 275, uAvionix AV-30-E.
- **Nav / Comm / Transponder**: Garmin GTN 750Xi, GTN 650Xi, GTR 205 (com), GTX 335
  (transponder), GMA 245 (audio) — at the real 6.25″ stack width.
- **Glass Displays**: Garmin G3X (GDU 460 / 450 / 470) and Dynon SkyView HDX (10″ / 7″).

Each item carries a **weight** (lb) and a typical **current draw** (amps, at 12 V nominal
— pneumatic gauges draw 0, panel lighting excluded) — manufacturers' published figures for
the real units, representative averages for the idealized ones. The inspector shows a live
**item count + total weight + total amps** for the panel; per-item figures appear in the
palette and on the selection.

## Airspeed V-speeds

The ASI colour arcs are driven by the design's V-speeds, defaulting to Van's published
**RV-8** markings (statute mph): white arc V<sub>S0</sub> 58 → V<sub>FE</sub> 100, green
V<sub>S1</sub> 64 → V<sub>NO</sub> 142, yellow V<sub>NO</sub> 142 → V<sub>NE</sub> 230,
red line at V<sub>NE</sub> 230. Edit them (and the scale max) in the inspector, or pick
the **kt** preset (V<sub>NE</sub> 200, etc.). V-speeds are stored per design, so each
aircraft keeps its own.

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

## Contributing

Want to take this somewhere new? **Fork it** — no permission needed. If instead you'd like
to contribute back to this repo, PRs are welcome (especially new instruments) when they
fit the [Philosophy](#philosophy) above. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to
add an instrument and the pre-PR checklist.

## License

[MIT](LICENSE) © 2026 Guido Bartolucci.
