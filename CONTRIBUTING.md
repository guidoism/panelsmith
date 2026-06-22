# Contributing to Panelsmith

Contributions are welcome — especially new instruments. The bar is simple: a PR should
**respect the project's principles** (see the [Philosophy](README.md#philosophy) in the
README) and keep the project small, honest, and dependency-free.

In short: no build step, real-world accuracy, pure-SVG instruments, local-first, and code
anyone can read.

## Adding an instrument

Instruments live in `js/instruments.js` as entries in the `CATALOG` array:

```js
{
  id: 'g5',                 // unique, stable, lowercase
  name: 'Garmin G5',        // shown in the palette
  category: 'Electronic Flight Instruments',
  w: 86, h: 91,             // TRUE size in millimetres
  weight: 0.83,             // pounds
  svg: g5,                  // () => string of inner <g> markup
  link: 'https://…',        // optional — real, buyable products only
  vendor: 'Aircraft Spruce' // optional — shown with the link
}
```

The `svg()` function returns SVG markup **centered on the origin (0,0)**, drawn in
millimetres, spanning `-w/2..w/2` and `-h/2..h/2`. Follow the existing helpers:

- Include a `<rect class="sel-outline" …>` (or the round `bezel()` which adds one) so the
  selection highlight works.
- Reference the shared gradients in `DEFS` (e.g. `url(#bezelFace)`, `url(#dialFace)`,
  `url(#glassGloss)`) rather than defining your own — they're injected once into the stage
  and every thumbnail.
- Use `nextId()` for any `clipPath`/gradient ids you must define locally, so multiple
  copies on one panel don't collide.
- No raster images. Draw it as SVG.

**Idealized vs. real:** generic instruments (for early sketching) have no `link`. Real,
buyable products get a `link` + `vendor` and **must cite a source** for their dimensions
and weight (manufacturer spec sheet, POH, Aircraft Spruce listing). Don't eyeball numbers.

## If you edit the blank panel SVG

The panel is inlined into `js/panel-data.js` (so the app needs no `fetch` and runs from
`file://`). If you change `rv-8-panel-blank.svg`, regenerate it — the command is in the
[README](README.md#code-map).

## Verify before opening a PR

```sh
node --check js/*.js        # syntax
```

Then open `index.html` in a browser, place a couple of instruments (including any you
added), confirm they're at sane scale against the panel, and run **Export PNG**.

## PR etiquette

- Keep PRs focused — one feature or instrument set per PR.
- **Source any real-world numbers** (dimensions, weights, V-speeds) in the PR description.
- **No new build tooling or runtime dependencies.** If it needs `npm install`, it doesn't
  belong here.
- Match the surrounding code style; keep it readable.

By contributing you agree your work is licensed under the project's [MIT
License](LICENSE).
