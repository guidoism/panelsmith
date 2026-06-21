  Van's RV-8 panel file conversion workflow

  Tested on macOS with FreeCAD 1.0 and Inkscape.

  Tools and paths

  - FreeCAD CLI: /Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd
  - Inkscape CLI: /Applications/Inkscape.app/Contents/MacOS/inkscape
  - Source IGES (3D panel): /Users/guido/Dropbox/Aviation/RV-8/RV-8 3D Panel.IGS
  - Source DXF (2D panel): /Users/guido/Dropbox/Aviation/RV-8/RV-8_2D_Panel.dxf
  - Output: /Users/guido/Downloads/RV-8 Panel/

  IGES → STL (for OpenSCAD) + STEP (for SketchUp)

  OpenSCAD cannot read IGES or STEP directly — must convert to STL mesh. Use FreeCAD's Part module headless:

  import Part, MeshPart
  shape = Part.Shape(); shape.read(IGES_PATH)
  shape.exportStep(STEP_OUT)
  mesh = MeshPart.meshFromShape(Shape=shape, LinearDeflection=0.1, AngularDeflection=0.5)
  mesh.write(STL_OUT)

  Run with freecadcmd script.py. STEP file will be large (~95 MB for the Van's panel) but surfaces are preserved. STL is
  mesh-only.

  For SketchUp 2024+: File → Import → STEP. SketchUp's CLI is unreliable for STEP import; do it interactively.

  DXF → SVG

  Two things that DON'T work:

  - QCAD CLI (dwg2svg): trial version stamps "QCAD.org Trial Version" across the output. Unusable without a license.
  - Inkscape CLI on DXF directly: errors with "Start tag expected" — the CLI doesn't route DXF through Inkscape's import
  extension.

  What works: FreeCAD's Draft module (importDXF.insert) headless. Walk each shape's .Edges, call .discretize(60) for
  points, emit SVG paths. DXF is y-up, SVG is y-down — flip y by negating. Set explicit width="…mm" height="…mm" and
  viewBox in mm so the SVG carries physical dimensions for 1:1 printing.

  For the panel DXF specifically, FreeCAD interprets it as inches and scales 1 DXF unit = 25.4 mm. Output ends up in mm.

  Then rasterize via Inkscape:
  inkscape file.svg --export-type=png --export-dpi=300 \
    --export-background=white --export-filename=out.png

  RV-8 panel-specific compositing

  The DXF contains four pieces in a 2×2 grid:

  - Top row = old semi-prepunched panel (pre-9/06 kits)
  - Bottom row = new fully-prepunched panel (post-9/06, "PP" kits — this is what Guido has)
  - Left column in each row = main instrument panel
  - Right column = curved side/shroud piece

  Filter to the bottom row by checking each shape's bbox centroid against the y-midline of all shapes. Then split into
  main and sub groups by x-midline.

  Mirroring to make a left side piece: reflect about the sub's own vertical center: x_new = sub_xmin + sub_xmax - x. This
  keeps the bbox the same; only the content flips.

  Finding the correct overlap with the main panel is the non-obvious part. Do NOT just butt the inboard vertical edges
  together — the side pieces overlap the main panel substantially behind it. Find the assembled position by matching hole
  patterns:

  1. Extract all circles from both main and sub: iterate edges, check edge.Curve.__class__.__name__ == 'Circle', record
  (center.x, center.y, radius).
  2. For every (main_hole, sub_hole) pair where radii match within 0.01 mm AND y values match within 0.1 mm, record dx =
  main_x - sub_x.
  3. The most common dx across all matches is the assembled shift. For the RV-8 PP panel this is −508 mm (≈20"), with 6
  corroborating hole-pair matches.

  Apply that shift to the right sub. For the mirrored left sub, place it symmetrically: target center = 2 * main_center -
  right_sub_center.

  The result: each side piece extends ~12" behind the main panel (hidden overlap, structural) and ~4.6" past the outboard
  edge (visible skirt). Add 25 mm margin around the final viewBox.

  Printing at 1:1

  The SVG carries explicit mm dimensions. Print at 100% / "Actual Size" (NOT fit-to-page) on a 36" plotter for life-size
  template. Main panel should print at ~24" wide × ~7" tall. If exporting through Pixelmator first, units can get lost —
  print from Inkscape or the raw SVG to preserve scale.
