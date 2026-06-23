# Fonts

Panelsmith renders instrument text in **B612** and **B612 Mono** — the open-source font
family Airbus + ENAC designed for aircraft cockpit displays (see
[`docs/typefaces/`](../docs/typefaces/) for the specimen and background).

## How they're shipped

The fonts are **subsetted** (Basic Latin + the few symbols the instruments use: `° · × –
—` etc.) and **base64-embedded** as woff2 inside [`js/font-data.js`](../js/font-data.js).
This is deliberate, for two reasons:

1. **PNG export.** Export rasterizes a serialized copy of the stage SVG via an `<img>`,
   which can't see the page's webfonts — only fonts embedded *inside* the SVG. So the
   `@font-face` rules must travel with the SVG (`export-png.js` injects `APP.FONT_CSS`).
2. **`file://`.** Embedding keeps the app self-contained, so it still works by
   double-clicking `index.html` with no server and no external font requests.

Total embedded cost is ~27 KB (three subsetted woff2 faces). No CDN, no network, no
tracking.

## License

B612 is licensed under the **SIL Open Font License 1.1** — see
[`OFL-B612.txt`](OFL-B612.txt). It does **not** declare a Reserved Font Name, so the
subsetted faces keep the name "B612". Copyright 2012 The B612 Project Authors,
<https://github.com/polarsys/b612>.

## Regenerating

The full upstream fonts come from the [PolarSys B612
repo](https://github.com/polarsys/b612). Subset + embed with `fontTools` (`pyftsubset
--flavor=woff2 --unicodes=U+0020-007E,…`) then base64 the woff2 into `js/font-data.js`.
