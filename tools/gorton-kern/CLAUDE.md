# CLAUDE.md — Gorton kern tool

Working notes for the `build_kern.py` font-prep tool. This is **offline tooling**, not
part of the app runtime — it produces the Gorton woff2 that gets base64-embedded into
`js/font-data.js`.

## What it does

`Gorton Digital` (the drdnar revival) ships with **no kerning** and **lopsided
sidebearings** (LSB ≈ 140 / RSB ≈ 350 on a 3524-unit em), so unkerned text looks loose and
gappy — worst on double-diagonal/open pairs (AV, AW, AY, LT, VA, TA…). `build_kern.py`:

1. **Tightens** the right sidebearings to `--target-rsb` (default 70) so inter-letter
   spacing is even. Metrics only — no outline edits.
2. **Grafts a kern table** by transplanting the kern *values* of a reference gothic
   (**News Cycle**, an OFL News Gothic revival), scaled by the em ratio (`gorton_em /
   ref_em`). We borrow a professional face's pair judgments because the hard pairs
   (AV-type) are where optical/from-scratch kerning fails — the visual hole is at the top
   but the closest ink is at the bottom, so naive min-gap kerning under-kerns them.

Output is a single OTF with adjusted `hmtx` + a new GPOS `kern` feature. No glyph outlines
are changed (keeps us on the right side of the font's terms; see
`fonts/GORTON-LICENSE.txt`).

## Run

```sh
python3 build_kern.py \
  --gorton    GortonDigitalRegular.otf \   # from github.com/drdnar/GortonDigital (release OTFs)
  --reference NewsCycle-Bold.ttf \         # OFL, github.com/google/fonts ofl/newscycle
  --out       GortonPrepared.otf
# optional: --target-rsb 70  --scale 1.0  --min-abs 18
```

Needs `fontTools` (and `brotli` only if you also emit woff2). The source fonts are **not**
committed here — Gorton is non-commercial, News Cycle is freely downloadable; fetch both
and pass their paths.

## Then embed it

`GortonPrepared.otf` is subsetted (Basic Latin + symbols, **keeping the `kern` feature**)
to woff2 and base64-embedded into `js/font-data.js` as the `Gorton` `@font-face`. Keep
`layout_features=['kern']` in the subsetter options or kerning is dropped. The kern table
adds ~2 KB after subsetting + woff2.

## Tuning notes

- `--scale` multiplies the transplanted values if Gorton wants more/less than News Cycle.
- `--min-abs` drops near-zero pairs to keep the table small.
- A pure-optical alternative (compute amounts from Gorton's own contours, equalized to a
  straight-pair like HH) works for round/vertical pairs but under-kerns double-diagonals —
  which is exactly why we transplant instead. If revisited, a *hybrid* (transplant for
  diagonals, optical for the rest) is the natural next step.
- Verify by rendering diagonal-heavy words (AVIONICS, TAXIWAY, WAVE, LT VFR) before/after.
