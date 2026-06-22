# Panelsmith roadmap

Where the project is and where it's going. This is a direction, not a promise — and under
the [MIT license](LICENSE) you're free to fork and build any of it yourself. Ordering
reflects dependency and value, not a schedule.

## Shipped

- True-millimetre panel with drag/drop placement, snapping, alignment guides,
  pan/zoom/grid.
- Idealized 3⅛″ rounds (attitude, DG, ASI, altimeter, VSI, turn coordinator) and three AoA
  / lift indicators — all pure SVG.
- Real, buyable units with sourced dimensions/weights and purchase links: Garmin G5, GI
  275, uAvionix AV-30-E, Garmin GTN 750Xi / 650Xi, GTR 205, GTX 335, GMA 245, G3X GDU 460
  / 450 / 470, Dynon SkyView HDX 10″ / 7″.
- V-speed-driven ASI colour arcs, stored per design.
- Live **weight total** and **current-draw (amps) total**, per-item and running.
- localStorage designs, JSON import/export, PNG export.

## The through-line

The amps total is the first step of an **electrical load analysis** — and a load analysis
is the spine of Bob Nuckolls' *The AeroElectric Connection*. The roadmap below chains off
it:

> instrument → assigned **bus** → bus fed by **power source(s)** per a chosen
> **architecture** → does the resulting battery-only endurance and equipment set satisfy
> the **mission**?

Items 1–4 deliberately grow Panelsmith from a *layout* tool into a *layout + electrical
design* tool. That expansion is intentional. It breaks none of the [hard
invariants](CLAUDE.md#hard-invariants--do-not-break-these) — still no build step, still
local-first, still physically honest — but it does enlarge the surface, so "[stay small
and readable](README.md#philosophy)" becomes something to actively defend as each piece
lands.

## Order of work

Effort is rough: **S** ≈ an afternoon · **M** ≈ a few sessions · **L** ≈ a substantial
project · **XL** ≈ its own product.

### 1. Buses + per-bus sub-totals — `S–M`

Add a `bus` assignment per placed instrument (Main · Endurance / E-bus · Battery ·
Avionics) and show weight/amps sub-totals per bus alongside the panel total. Small,
foundational; everything below depends on it.

### 2. Switches, breakers, busbars (and more hardware) — `M`

New instrument categories: toggle/rocker switches, circuit breakers, busbars, plus 2¼″
rounds and additional radios. Needed both for completeness and because you have to be able
to *draw* the electrical system before you can design it.

### 3. Architecture picker + endurance calc + principle checks — `M`

Choose a power-system architecture based on Nuckolls' "Z-figures":

- **Z-11** — single battery / single alternator, main + endurance bus. The standard
  light-aircraft architecture.
- **Z-13/8** — adds an SD-8 standby alternator on the E-bus; popular for IFR.
- **Z-14** — dual battery / dual alternator with cross-feed; full redundancy.

The architecture defines the power sources and which buses survive an alternator failure.
Combined with the per-bus loads from #1, compute **battery-only endurance**. Encode the
book's rules as pass/fail checks (e.g. "E-bus load light enough for useful endurance,"
"every source has overcurrent protection") and **cite** the relevant Z-figure/chapter
rather than reproducing the text — same respect-the-source stance as principle 8.

> Verify exact Z-figure numbers and rules against a current revision of the book before
> encoding them.

### 4. Missions as requirement profiles — `M`

Each mission is a required-equipment set plus a minimum battery endurance, checked live
against the panel (green/red checklist):

1. **Day VFR, away from Class B** — minimal: ASI/ALT/compass, one com.
2. **Day VFR near big cities** — adds ADS-B Out transponder, nav.
3. **Day + Night VFR** — adds lighting; electrically dependent, so endurance matters.
4. **Night VFR, IR pilot, "minimal to get down if I blunder into IMC"** — backup
   battery-backed attitude (e.g. G5), backup com, redundant power (→ Z-13/8). Legal
   minimum plus survivability, not certified IFR.
5. **Full IFR** — dual sources (→ Z-14), two nav sources, generous endurance.

### 5. Per-instrument depth → 3D export — `L`

Add a protrusion-depth field per instrument. That unlocks two things:

- **glTF export** for Blender — a plain-JS JSON serializer (no build step), each
  instrument an extruded box, plus the panel cutouts. Far friendlier than importing raw
  SVG, for photorealistic prototyping.
- **STL fit-check** against `RV-8_Panel.stl` — see how units pack into the avionics bay
  (conversion pipeline in `NOTES.md`).

### 6. Panel simulator — `XL`

Quick-and-dirty animation of basic instrument behaviour (needles, tapes, attitude). The
most fun and the largest scope, and the least aligned with "stay small." Someday / maybe.

## Other ideas (unscheduled)

- Real product-specific variants behind each idealized round.
- Multiple aircraft models / multi-user — the `designs.js` repository interface is kept
  backend-swappable for this.
- Polish: price estimates, panel cutout templates, tidy the GMA 245 vendor link.
