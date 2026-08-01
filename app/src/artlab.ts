/**
 * Dev-only art lab: renders the whole cast large for visual iteration.
 * Served at /art-lab.html by the dev server; not part of the build.
 */

import { ANIMALS } from './data/animals';
import { drawAnimal } from './game/art';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const g = canvas.getContext('2d')!;


function frame(): void {
  const t = performance.now() / 1000;
  g.clearRect(0, 0, canvas.width, canvas.height);

  // hero pair — big naked cats for silhouette judgment
  drawAnimal(g, ANIMALS[0], 240, 210, 320, { t, squash: 0, sing: 0, dir: 0 });
  drawAnimal(g, ANIMALS[1], 620, 210, 320, { t: t + 0.5, squash: 0, sing: 0, dir: 0 });
  // one singing
  drawAnimal(g, ANIMALS[0], 990, 210, 320, { t, squash: 0, sing: 1, dir: 0 });

  // full cast with demo outfits
  ANIMALS.forEach((a, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    drawAnimal(
      g,
      a,
      170 + col * 300,
      520 + row * 230,
      190,
      { t: t + i * 0.3, squash: 0, sing: 0, dir: 0 }
    );
  });
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
