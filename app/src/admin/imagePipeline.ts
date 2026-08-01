/**
 * Artwork sanitizing pipeline (admin studio).
 *
 * Every uploaded image is decoded and re-encoded entirely in the browser —
 * that alone strips all metadata/EXIF, and SVG is rejected at the gate.
 * Then: optional flood-fill background removal from the corners, alpha
 * trim, and normalization into the game's standard 100-unit frame (ground
 * line at 92%, art centered, capped width/height) so every character stands
 * on the same stage line regardless of how the source was framed.
 */

export const OUT_SIZE = 1024;
export const GROUND = 0.92;
const TOP = 0.09;
const MAX_W = 0.88;

export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';
const MAX_IMAGE_MB = 25;

/** Gate + decode. Returns an error message string on rejection. */
export async function fileToBitmap(f: File): Promise<ImageBitmap | string> {
  if (!/^image\/(png|jpeg|webp)$/.test(f.type)) {
    return 'Only PNG/JPG/WebP raster images are accepted (no SVG).';
  }
  if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
    return `File is over ${MAX_IMAGE_MB} MB.`;
  }
  try {
    return await createImageBitmap(f);
  } catch {
    return 'Could not decode that file as an image.';
  }
}

/**
 * Sanitize + normalize into the standard frame.
 * tolerance 0 keeps the background (for already-transparent PNGs).
 */
export function sanitizeImage(
  bitmap: ImageBitmap,
  tolerance: number,
): { canvas: HTMLCanvasElement } | { error: string } {
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const wg = work.getContext('2d', { willReadFrequently: true })!;
  wg.drawImage(bitmap, 0, 0, w, h);

  const data = wg.getImageData(0, 0, w, h);
  if (tolerance > 0) removeBackground(data, w, h, tolerance);
  wg.putImageData(data, 0, 0);

  const bounds = trimBounds(data, w, h);
  if (!bounds) {
    return { error: 'Image is fully transparent after background removal — lower the tolerance.' };
  }
  const tw = bounds.x1 - bounds.x0 + 1;
  const th = bounds.y1 - bounds.y0 + 1;

  const out = document.createElement('canvas');
  out.width = OUT_SIZE;
  out.height = OUT_SIZE;
  const g = out.getContext('2d')!;
  const availH = (GROUND - TOP) * OUT_SIZE;
  const availW = MAX_W * OUT_SIZE;
  const k = Math.min(availH / th, availW / tw);
  const dw = tw * k;
  const dh = th * k;
  g.drawImage(work, bounds.x0, bounds.y0, tw, th, (OUT_SIZE - dw) / 2, GROUND * OUT_SIZE - dh, dw, dh);
  return { canvas: out };
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
}

/**
 * Center cover-crop into an exact square (posters, app icons, splashes).
 * Decode → re-encode also strips all metadata, same as the sprite path.
 */
export function coverSquare(bitmap: ImageBitmap, out: number): HTMLCanvasElement {
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(bitmap, sx, sy, side, side, 0, 0, out, out);
  return canvas;
}

/** flood-fill background removal seeded from the four corners */
function removeBackground(img: ImageData, w: number, h: number, tol: number): void {
  const d = img.data;
  const idx = (x: number, y: number) => (y * w + x) * 4;
  const seeds = [idx(0, 0), idx(w - 1, 0), idx(0, h - 1), idx(w - 1, h - 1)];
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  for (const s of seeds) {
    if (d[s + 3] < 10) continue; // already-transparent corner → nothing to key
    stack.push(s / 4);
  }
  if (stack.length === 0) return;
  const r0 = d[stack[0] * 4];
  const g0 = d[stack[0] * 4 + 1];
  const b0 = d[stack[0] * 4 + 2];
  while (stack.length) {
    const p = stack.pop()!;
    if (visited[p]) continue;
    visited[p] = 1;
    const i = p * 4;
    const dr = d[i] - r0;
    const dg = d[i + 1] - g0;
    const db = d[i + 2] - b0;
    if (Math.sqrt(dr * dr + dg * dg + db * db) > tol) continue;
    d[i + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
}

function trimBounds(
  img: ImageData,
  w: number,
  h: number,
): { x0: number; y0: number; x1: number; y1: number } | null {
  const d = img.data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}
