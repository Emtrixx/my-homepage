import { domToCanvas } from 'modern-screenshot';

/* Renders the full document to a canvas (foreignObject SVG under the hood —
   same-origin fonts/images are inlined as data: URLs, which the CSP allows),
   then crops to the currently visible viewport. Must run BEFORE any transform
   is applied to the page. */
export async function captureViewport(
  vw: number,
  vh: number,
  scrollY: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const full = await domToCanvas(document.body, {
    scale,
    backgroundColor: '#0a0e1a',
  });

  const out = document.createElement('canvas');
  out.width = Math.round(vw * scale);
  out.height = Math.round(vh * scale);
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(
    full,
    0,
    Math.round(scrollY * scale),
    out.width,
    Math.min(out.height, full.height - Math.round(scrollY * scale)),
    0,
    0,
    out.width,
    Math.min(out.height, full.height - Math.round(scrollY * scale))
  );
  return out;
}
