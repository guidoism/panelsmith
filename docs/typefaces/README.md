# Aircraft typefaces — reference

[`aircraft-typeface-specimen.pdf`](aircraft-typeface-specimen.pdf) is a two-page specimen:
page 1 compares the four typographic lineages used on aircraft placards and instruments,
page 2 contrasts engraved (Gorton) vs. printed (News Gothic) military-panel lettering.
It's a design reference for choosing authentic fonts for Panelsmith's labels and
glass-display text (today the app renders labels in Arial).

The file is **PDF/A-2b** (archival) — every font is embedded and an sRGB OutputIntent is
included, so it renders identically on any computer, now and in the future.

## The four lineages

1. **Modern glass-cockpit screen — B612.** Designed by Airbus + ENAC / Université de
   Toulouse for cockpit *displays* (legibility under glare and vibration), open-sourced in
   2017. Shown with its `B612 Mono` companion.
2. **U.S. military instrument panels — MIL-M-18012** (now SAE AS18012). The standard names
   **Gorton** for engraving and **Futura Demibold / News Gothic** for
   printed/silk-screened markings. The specimen shows News Gothic.
3. **WWII-era aircraft lettering — “Spartan.”** The 1940s RAF panel/placard letterforms, a
   geometric relative of Renner's Futura. U.S. exterior *data blocks* used slanted stencil
   forms (USAAF ~45° “Amarillo”, USN ~30° “LongBeach”).
4. **RAF 851ATH & modern GA silk-screen — condensed grotesque** (≈ Helvetica Medium
   Condensed). The look homebuilt/GA shops cut for placards and engraved strips today.

**Page 2 — engraved vs. printed:** a closer comparison of **Gorton** (the
machine-engraving alphabet — constant-width monoline strokes a pantograph/CNC cutter can
trace, the classic mid-century instrument-panel look) against **News Gothic** (a
typographic printing face). Same words, two faces, so the process-driven difference is
obvious.

## Fonts used in the specimen & licensing

The PDF embeds subsets of each face for display only:

| Shown as | Font file | License |
|----------|-----------|---------|
| B612 / B612 Mono | B612 (Airbus / PolarSys) | SIL Open Font License |
| Spartan | League Spartan | SIL Open Font License |
| News Gothic | News Gothic (Linotype) | Commercial — author's licensed copy; **not** redistributed as a font file |
| Trade Gothic Cond | Trade Gothic (Linotype) | Commercial — author's licensed copy; **not** redistributed as a font file |
| Gorton | Gorton Digital ([drdnar](https://github.com/drdnar/GortonDigital)) | Free for **non-commercial** use; specimen subset only, **not** redistributed as a font file |

Only the OFL faces are freely redistributable. The commercial faces appear as embedded PDF
subsets (standard for document distribution), not as installable font files. If a fully
OFL-only version is ever needed, News Gothic / Trade Gothic can be swapped for open
gothics (e.g. a libre News-Gothic-like and a libre condensed grotesque).
