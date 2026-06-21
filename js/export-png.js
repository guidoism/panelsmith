// Flatten the stage SVG (panel + instruments) to a high-resolution PNG. Because
// the stage is one self-contained SVG in mm, export = clone, frame the full
// panel, inline the styles it needs, rasterize to canvas, download.

(function () {
const P = APP.PANEL_VIEWBOX;

const SVGNS = 'http://www.w3.org/2000/svg';
const PX_PER_MM = 5;          // ~4800px wide — crisp for print/screen

// Styles the standalone SVG needs (external CSS doesn't travel with it).
const EXPORT_CSS = `
  .panel-bg path { stroke: #14181f; fill: none; }
  .sel-outline { fill: none; stroke: none; }
  .hit { fill: none; }
  .grid-lines { display: none; }
`;

async function exportPNG(stage, name) {
  const margin = 28, titleSpace = 40, bottomSpace = 26;
  const vb = {
    x: P.x - margin,
    y: P.y - titleSpace,
    w: P.w + margin * 2,
    h: P.h + titleSpace + bottomSpace,
  };

  const clone = stage.svg.cloneNode(true);
  clone.setAttribute('xmlns', SVGNS);
  clone.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  clone.setAttribute('width', vb.w);
  clone.setAttribute('height', vb.h);

  // remove any selection highlight from the export
  clone.querySelectorAll('.instrument.selected').forEach(n => n.classList.remove('selected'));

  const style = document.createElementNS(SVGNS, 'style');
  style.textContent = EXPORT_CSS;

  const bg = document.createElementNS(SVGNS, 'rect');
  bg.setAttribute('x', vb.x); bg.setAttribute('y', vb.y);
  bg.setAttribute('width', vb.w); bg.setAttribute('height', vb.h);
  bg.setAttribute('fill', '#ffffff');

  const title = document.createElementNS(SVGNS, 'text');
  title.setAttribute('x', P.x + P.w / 2);
  title.setAttribute('y', P.y - titleSpace / 2 + 4);
  title.setAttribute('text-anchor', 'middle');
  title.setAttribute('font-family', 'sans-serif');
  title.setAttribute('font-size', '20');
  title.setAttribute('font-weight', '600');
  title.setAttribute('fill', '#14181f');
  title.textContent = (name || 'Untitled design') + '  ·  RV-8 panel';

  clone.insertBefore(bg, clone.firstChild);
  clone.insertBefore(style, clone.firstChild);
  clone.append(title);

  const svgText = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vb.w * PX_PER_MM);
    canvas.height = Math.round(vb.h * PX_PER_MM);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    downloadBlob(pngBlob, safeName(name) + '.png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not rasterize SVG'));
    img.src = url;
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeName(name) {
  return (name || 'rv8-panel').trim().replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'rv8-panel';
}

APP.exportPNG = exportPNG;
})();
