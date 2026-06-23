#!/usr/bin/env python3
"""Prepare Gorton Digital for Panelsmith: tighten metrics + graft a kern table
derived from a reference gothic (News Cycle, an OFL News Gothic revival).

Why: Gorton Digital ships with no kerning and lopsided sidebearings. We already
tighten the right sidebearings for even spacing; this tool additionally borrows
a professional face's kern *values* (scaled to Gorton's em) for the hard
double-diagonal/open pairs (AV, AW, AY, LT, VA, ...) that optical kerning
handles poorly.

Usage:
    python3 build_kern.py --gorton GortonDigitalRegular.otf \
        --reference NewsCycle-Bold.ttf --out GortonPrepared.otf

Only horizontal metrics + a new GPOS 'kern' feature are added; no glyph
outlines are modified. See CLAUDE.md.
"""
import argparse, tempfile, os
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.feaLib.builder import addOpenTypeFeatures

CHARSET = (" ABCDEFGHIJKLMNOPQRSTUVWXYZ"
           "abcdefghijklmnopqrstuvwxyz"
           "0123456789.,-/:")

def tighten(font, target_rsb=70):
    """Rebalance the right sidebearings so inter-letter spacing is even."""
    hmtx = font['hmtx']; gs = font.getGlyphSet()
    space = font.getBestCmap().get(0x20); red = 0; n = 0
    for g in font.getGlyphOrder():
        aw, lsb = hmtx[g]; bp = BoundsPen(gs)
        try: gs[g].draw(bp)
        except Exception: bp.bounds = None
        if bp.bounds is None: continue
        na = int(round(bp.bounds[2] + target_rsb))
        if 0 < na < aw: red += aw - na; n += 1; hmtx[g] = (na, lsb)
    if space and n:
        aw, lsb = hmtx[space]; hmtx[space] = (max(400, int(aw - red / n)), lsb)

def extract_kerning(font, charset_glyphs):
    """Pull {(gname1,gname2): xAdvance} from a font's GPOS, restricted to the
    charset (handles PairPos format 1 & 2, and Extension lookups)."""
    pairs = {}
    if 'GPOS' not in font: return pairs
    order = [g for g in font.getGlyphOrder() if g in charset_glyphs]
    for lookup in font['GPOS'].table.LookupList.Lookup:
        subs = lookup.SubTable; ltype = lookup.LookupType
        for st in subs:
            if ltype == 9:  # Extension
                st = st.ExtSubTable
            if getattr(st, 'Format', None) not in (1, 2): continue
            if st.Format == 1:
                cov = st.Coverage.glyphs
                for i, first in enumerate(cov):
                    if first not in charset_glyphs: continue
                    for pvr in st.PairSet[i].PairValueRecord:
                        v = pvr.Value1
                        if v and getattr(v, 'XAdvance', 0) and pvr.SecondGlyph in charset_glyphs:
                            pairs[(first, pvr.SecondGlyph)] = v.XAdvance
            else:  # Format 2 (class kerning)
                cd1 = st.ClassDef1.classDefs if st.ClassDef1 else {}
                cd2 = st.ClassDef2.classDefs if st.ClassDef2 else {}
                cov = set(st.Coverage.glyphs)
                firsts = {}; seconds = {}
                for g in cov:
                    if g in charset_glyphs: firsts.setdefault(cd1.get(g, 0), []).append(g)
                for g in order: seconds.setdefault(cd2.get(g, 0), []).append(g)
                for c1, c1rec in enumerate(st.Class1Record):
                    for c2, c2rec in enumerate(c1rec.Class2Record):
                        v = c2rec.Value1
                        xa = getattr(v, 'XAdvance', 0) if v else 0
                        if not xa: continue
                        for g1 in firsts.get(c1, []):
                            for g2 in seconds.get(c2, []):
                                pairs[(g1, g2)] = xa
    return pairs

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gorton', required=True)
    ap.add_argument('--reference', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--target-rsb', type=int, default=70)
    ap.add_argument('--scale', type=float, default=1.0, help='extra factor on transplanted kern')
    ap.add_argument('--min-abs', type=int, default=18, help='drop pairs whose scaled kern is smaller than this (font units)')
    args = ap.parse_args()

    gorton = TTFont(args.gorton)
    g_em = gorton['head'].unitsPerEm
    g_cmap = gorton.getBestCmap()
    g_glyph = {ch: g_cmap[ord(ch)] for ch in CHARSET if ord(ch) in g_cmap}

    tighten(gorton, args.target_rsb)

    ref = TTFont(args.reference)
    r_em = ref['head'].unitsPerEm
    r_cmap = ref.getBestCmap()
    r_charset_glyphs = {r_cmap[ord(ch)] for ch in CHARSET if ord(ch) in r_cmap}
    r_rev = {v: k for k, v in r_cmap.items()}
    ref_pairs = extract_kerning(ref, r_charset_glyphs)

    factor = (g_em / r_em) * args.scale
    fea_lines = ["languagesystem DFLT dflt;", "languagesystem latn dflt;", "feature kern {"]
    kept = 0; samples = {}
    for (rg1, rg2), val in sorted(ref_pairs.items()):
        c1 = chr(r_rev.get(rg1, 0)); c2 = chr(r_rev.get(rg2, 0))
        if c1 not in g_glyph or c2 not in g_glyph: continue
        kv = int(round(val * factor))
        if abs(kv) < args.min_abs: continue
        fea_lines.append(f"  pos {g_glyph[c1]} {g_glyph[c2]} {kv};")
        kept += 1
        if c1 + c2 in ("AV", "AW", "AY", "AT", "VA", "LT", "TA", "P.", "F."):
            samples[c1 + c2] = kv
    fea_lines += ["} kern;", ""]
    fea = "\n".join(fea_lines)

    with tempfile.NamedTemporaryFile("w", suffix=".fea", delete=False) as f:
        f.write(fea); feapath = f.name
    addOpenTypeFeatures(gorton, feapath)
    os.unlink(feapath)
    gorton.save(args.out)

    print(f"reference em={r_em}  gorton em={g_em}  scale factor={factor:.3f}")
    print(f"reference kern pairs (charset): {len(ref_pairs)}  ->  kept for Gorton: {kept}")
    print("sample kerns (font units):", {k: samples[k] for k in samples})

if __name__ == "__main__":
    main()
