# Fonts

Panelsmith renders instrument text in **B612** and **B612 Mono** — the open-source font
family Airbus + ENAC designed for aircraft cockpit displays (see
[`docs/typefaces/`](../docs/typefaces/) for the specimen and background).

**Placards** additionally offer a font picker: B612, **News Cycle** (an OFL News Gothic
revival), **Barlow Semi Condensed** (a condensed gothic), **League Spartan** (geometric),
and **Gorton** (the engraved-panel look — see the non-commercial note below).

## How they're shipped

The fonts are **subsetted** (Basic Latin + the few symbols the instruments use: `° · × –
—` etc.) and **base64-embedded** as woff2 inside [`js/font-data.js`](../js/font-data.js).
This is deliberate, for two reasons:

1. **PNG export.** Export rasterizes a serialized copy of the stage SVG via an `<img>`,
   which can't see the page's webfonts — only fonts embedded *inside* the SVG. So the
   `@font-face` rules must travel with the SVG (`export-png.js` injects `APP.FONT_CSS`).
2. **`file://`.** Embedding keeps the app self-contained, so it still works by
   double-clicking `index.html` with no server and no external font requests.

Total embedded cost is ~58 KB base64 (six subsetted woff2 faces). No CDN, no network, no
tracking.

## License

- **B612 / B612 Mono** — **SIL Open Font License 1.1** ([`OFL-B612.txt`](OFL-B612.txt)).
  No Reserved Font Name, so the subset keeps the name "B612". © 2012 The B612 Project
  Authors, <https://github.com/polarsys/b612>.
- **News Cycle**, **League Spartan**, and **Barlow Semi Condensed** — **SIL Open Font
  License 1.1** (from Google Fonts). Freely redistributable. News Cycle is a News
  Gothic–style revival; the genuine Linotype **News Gothic is commercial and is *not*
  shipped** (only used locally as a kerning reference — see `tools/`).
- **Gorton** — ⚠ **NON-COMMERCIAL ONLY** ([`GORTON-LICENSE.txt`](GORTON-LICENSE.txt)). The
  drdnar "Gorton Digital" revival is free for non-commercial use; commercial use needs a
  license from the author. It's bundled because Panelsmith is a non-commercial hobby
  project. **If you fork Panelsmith for commercial use, remove Gorton** (its `@font-face`
  in `js/font-data.js` and the `gorton` entry in `APP.FONTS`) or license it. Everything
  else here is OFL/MIT-clean; Gorton is the one exception. Only its metrics were tightened
  (sidebearings), no glyphs changed.

## Regenerating

The full upstream fonts come from the [PolarSys B612
repo](https://github.com/polarsys/b612). Subset + embed with `fontTools` (`pyftsubset
--flavor=woff2 --unicodes=U+0020-007E,…`) then base64 the woff2 into `js/font-data.js`.
