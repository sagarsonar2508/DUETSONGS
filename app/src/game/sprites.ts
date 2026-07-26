/**
 * Hand-sculpted SVG character illustrations — the designer-grade art path.
 *
 * Each species is an individually authored illustration (organic bezier
 * silhouettes, fur tufts, flat cel colors with discrete shade shapes,
 * consistent warm outline) parameterized only by palette and small feature
 * toggles (sex, outfit, singing). Rendered to Image sprites and drawn to
 * canvas; characters without a sculpted template fall back to the old
 * parametric renderer.
 */

import type { AnimalDef, OutfitId } from '../data/animals';

const OUT = '#4a3b36';

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

export interface SpriteMeta {
  /** eye centers in the 100×100 viewBox, for the blink overlay */
  eyes: [number, number][];
  eyeR: number;
  /** which palette color sits behind the eyes (blink cover) */
  headFill: 'body' | 'belly' | 'accent';
}

interface TemplateArgs {
  def: AnimalDef;
  outfit: OutfitId;
  sing: boolean;
}

type Template = (a: TemplateArgs) => string;

/* ------------------------------ shared bits ------------------------------ */

function flowerSvg(x: number, y: number, r: number, petal: string): string {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5;
    s += `<circle cx="${(x + Math.cos(a) * r * 0.78).toFixed(1)}" cy="${(y + Math.sin(a) * r * 0.78).toFixed(1)}" r="${(r * 0.55).toFixed(1)}" fill="${petal}"/>`;
  }
  return s + `<circle cx="${x}" cy="${y}" r="${(r * 0.42).toFixed(1)}" fill="#fff3c9"/>`;
}

function bowSvg(x: number, y: number, k: number, color: string, dark: string): string {
  return `
  <g stroke="${dark}" stroke-width="1.4" stroke-linejoin="round">
    <path d="M${x - 0.6 * k} ${y} C${x - 4 * k} ${y - 3.4 * k} ${x - 6.4 * k} ${y - 2.8 * k} ${x - 6 * k} ${y - 0.4 * k} C${x - 5.8 * k} ${y + 2.2 * k} ${x - 3.4 * k} ${y + 2.6 * k} ${x - 0.6 * k} ${y}" fill="${color}"/>
    <path d="M${x + 0.6 * k} ${y} C${x + 4 * k} ${y - 3.4 * k} ${x + 6.4 * k} ${y - 2.8 * k} ${x + 6 * k} ${y - 0.4 * k} C${x + 5.8 * k} ${y + 2.2 * k} ${x + 3.4 * k} ${y + 2.6 * k} ${x + 0.6 * k} ${y}" fill="${color}"/>
    <circle cx="${x}" cy="${y}" r="${1.7 * k}" fill="${color}"/>
  </g>`;
}

/* --------------------------------- CAT ----------------------------------- */
/* Sculpted against the reference: wide soft head with cheek fur tufts,
   small outward ears, tiny wide-set bean eyes, pear body, two front leg
   columns, haunch creases, back paws peeking, thick tail lying forward. */

const catTemplate: Template = ({ def, outfit, sing }) => {
  const c = def.colors;
  const female = def.sex === 'f';
  const shadeCol = 'rgba(120,95,80,0.14)';
  const patch = c.accent;

  const tail = `
    <path d="M60 83 C74 87 84 84 86.5 73.5 C87.5 69 86 65.5 83.5 64" fill="none" stroke="${OUT}" stroke-width="12.6" stroke-linecap="round"/>
    <path d="M60 83 C74 87 84 84 86.5 73.5 C87.5 69 86 65.5 83.5 64" fill="none" stroke="${c.body}" stroke-width="9.6" stroke-linecap="round"/>
    ${
      def.sex === 'm'
        ? `<path d="M74.5 84.2 L76.8 77.4 M82.6 80.2 L85.8 74.6" stroke="${patch}" stroke-width="3.4" stroke-linecap="round" opacity="0.9"/>`
        : `<path d="M86.2 68.5 C86.2 66.8 85.3 65.2 83.5 64" fill="none" stroke="${c.cheek}" stroke-width="7.8" stroke-linecap="round"/>`
    }`;

  const veil = outfit === 'dress'
    ? `<path d="M30 22 C18 34 16 62 24 78 C34 84 42 84 46 80 C36 62 36 38 44 20 Z
        M70 22 C82 34 84 62 76 78 C66 84 58 84 54 80 C64 62 64 38 56 20 Z" fill="#ffffff" opacity="0.55"/>`
    : '';

  const body = `
    <path d="M36.5 50 C31 58 27.5 68 27.5 78.5 C27.5 87.5 34 91.5 50 91.5 C66 91.5 72.5 87.5 72.5 78.5 C72.5 68 69 58 63.5 50 Z" fill="${c.body}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M33.2 63 C29.8 70.5 30 79.5 33.6 86.5" fill="none" stroke="${OUT}" stroke-width="1.4" opacity="0.5" stroke-linecap="round"/>
    <path d="M66.8 63 C70.2 70.5 70 79.5 66.4 86.5" fill="none" stroke="${OUT}" stroke-width="1.4" opacity="0.5" stroke-linecap="round"/>
    <ellipse cx="50" cy="56.5" rx="9.5" ry="3.4" fill="${shadeCol}"/>`;

  const backFeet = `
    <g fill="${c.belly}" stroke="${OUT}" stroke-width="1.8">
      <path d="M25.5 86.5 a5.6 4.4 0 1 0 11 1.4 l-.4 -3.4 Z" />
      <path d="M74.5 86.5 a5.6 4.4 0 1 1 -11 1.4 l.4 -3.4 Z" />
    </g>
    <path d="M29.5 88.2 L29.5 90.8 M32.8 88.6 L32.8 91.2 M70.5 88.2 L70.5 90.8 M67.2 88.6 L67.2 91.2" stroke="${OUT}" stroke-width="1.1" stroke-linecap="round"/>`;

  const frontLegs = `
    <g stroke="${OUT}" stroke-width="1.4" opacity="0.55" fill="none" stroke-linecap="round">
      <path d="M44.6 65 C44.3 71 44.3 78 44.6 83"/>
      <path d="M55.4 65 C55.7 71 55.7 78 55.4 83"/>
    </g>
    <g fill="${c.belly}" stroke="${OUT}" stroke-width="1.8">
      <ellipse cx="43.8" cy="87.4" rx="5.4" ry="4.2"/>
      <ellipse cx="56.2" cy="87.4" rx="5.4" ry="4.2"/>
    </g>
    <path d="M42.2 88.6 L42.2 91.1 M45.4 88.9 L45.4 91.4 M54.6 88.9 L54.6 91.4 M57.8 88.6 L57.8 91.1" stroke="${OUT}" stroke-width="1.1" stroke-linecap="round"/>`;

  let outfitTorso = '';
  if (outfit === 'tuxedo') {
    outfitTorso = `
      <path d="M37.5 52 C32.5 59.5 29.5 68.5 29.5 78 C29.5 85.8 35.5 89.5 50 89.5 C64.5 89.5 70.5 85.8 70.5 78 C70.5 68.5 67.5 59.5 62.5 52 Z" fill="#3a3a44" stroke="#26262e" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M43.5 52.5 L56.5 52.5 L50 68 Z" fill="#ffffff" stroke="#d8d4dc" stroke-width="1.3"/>
      <circle cx="50" cy="72" r="1.1" fill="#1e1e26"/>
      <circle cx="50" cy="77.5" r="1.1" fill="#1e1e26"/>
      ${bowSvg(50, 54.5, 0.95, '#26262e', '#15151b')}`;
  } else if (outfit === 'dress') {
    outfitTorso = `
      <path d="M38 55 C30 66 25 78 24.5 87.5 C33 91 43 92 50 92 C57 92 67 91 75.5 87.5 C75 78 70 66 62 55 Z" fill="#ffffff" stroke="#dcc8d2" stroke-width="2" stroke-linejoin="round"/>
      <path d="M28 88.5 a5 4 0 0 0 9 .8 a5 4 0 0 0 9 .5 a5 4 0 0 0 8 0 a5 4 0 0 0 9 -.5 a5 4 0 0 0 9 -.8" fill="none" stroke="#ecd6e2" stroke-width="1.4"/>
      ${bowSvg(50, 60, 1.05, '#f5a8c2', '#d987a3')}`;
  } else if (outfit === 'scarf') {
    outfitTorso = `
      <g stroke="#b8544e" stroke-width="1.8" stroke-linejoin="round">
        <rect x="36" y="51.5" width="28" height="6.8" rx="3.4" fill="#e87a7a"/>
        <rect x="52" y="56" width="7.4" height="14" rx="3.4" fill="#e87a7a"/>
      </g>
      <path d="M53.5 65.5 L58 65.5 M53.5 68 L58 68" stroke="#b8544e" stroke-width="1.1" stroke-linecap="round"/>`;
  }

  const earL = `
    <path d="M30.5 22.5 C27.8 14.5 29.5 8 33.5 5.8 C38.5 8.5 42.5 13 44 17.8 C39.5 20 34.5 21.7 30.5 22.5 Z" fill="${def.sex === 'm' ? patch : c.body}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M33 18.6 C31.8 14.3 32.6 10.8 34.4 9.2 C37.2 11 39.5 13.7 40.4 16.4 C38 17.5 35.3 18.3 33 18.6 Z" fill="${c.cheek}" opacity="0.75"/>`;
  const earR = `
    <path d="M69.5 22.5 C72.2 14.5 70.5 8 66.5 5.8 C61.5 8.5 57.5 13 56 17.8 C60.5 20 65.5 21.7 69.5 22.5 Z" fill="${c.body}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M67 18.6 C68.2 14.3 67.4 10.8 65.6 9.2 C62.8 11 60.5 13.7 59.6 16.4 C62 17.5 64.7 18.3 67 18.6 Z" fill="${c.cheek}" opacity="0.75"/>`;

  const head = `
    <path d="M27.5 34
      C27.5 20.5 33.5 13 50 13
      C66.5 13 72.5 20.5 72.5 34
      C72.5 40.5 71 45.5 66.5 48.8
      C69 49.3 70.5 50.2 71.5 51.5
      C69 51.8 66.8 51.6 64.8 50.9
      C60.7 53 55.7 54 50 54
      C44.3 54 39.3 53 35.2 50.9
      C33.2 51.6 31 51.8 28.5 51.5
      C29.5 50.2 31 49.3 33.5 48.8
      C29 45.5 27.5 40.5 27.5 34 Z"
      fill="${c.body}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>`;

  const headPatchSvg = def.sex === 'm'
    ? `<clipPath id="hc"><path d="M27.5 34 C27.5 20.5 33.5 13 50 13 C66.5 13 72.5 20.5 72.5 34 C72.5 44 68.5 50 60 52.6 C56.9 53.6 53.5 54 50 54 C44.3 54 39.3 53 35.2 50.9 C30 48 27.5 42 27.5 34 Z"/></clipPath>
       <path d="M26 26 C29 17 37 12.5 44 14.5 C42 22 36.5 28.5 29 30.5 Z" fill="${patch}" opacity="0.9" clip-path="url(#hc)"/>`
    : '';

  const stripes = `
    <g stroke="${patch}" stroke-width="2.4" stroke-linecap="round" opacity="${female ? 0.5 : 0.95}">
      <path d="M45.5 14.5 L44.8 21"/>
      <path d="M50 14 L50 20.8"/>
      <path d="M54.5 14.5 L55.2 21"/>
    </g>`;

  const eyes = `
    <g fill="${OUT}">
      <ellipse cx="40" cy="36" rx="2.5" ry="3.2"/>
      <ellipse cx="60" cy="36" rx="2.5" ry="3.2"/>
    </g>
    <circle cx="39.1" cy="34.7" r="0.95" fill="#ffffff"/>
    <circle cx="59.1" cy="34.7" r="0.95" fill="#ffffff"/>
    ${
      female
        ? `<g stroke="${OUT}" stroke-width="1.1" stroke-linecap="round">
             <path d="M37.4 33.4 L35.6 31.9"/><path d="M36.8 35.4 L34.7 34.5"/>
             <path d="M62.6 33.4 L64.4 31.9"/><path d="M63.2 35.4 L65.3 34.5"/>
           </g>`
        : ''
    }`;

  const muzzle = `
    <ellipse cx="50" cy="44.4" rx="7.6" ry="5.2" fill="${c.belly}" opacity="0.9"/>
    <path d="M48.3 41.7 Q50 40.9 51.7 41.7 Q51.3 43.8 50 44.3 Q48.7 43.8 48.3 41.7 Z" fill="#d98b94" stroke="${OUT}" stroke-width="0.9"/>`;

  const mouth = sing
    ? `<g stroke="${OUT}" stroke-width="1.3">
         <ellipse cx="50" cy="47.6" rx="3.3" ry="4.1" fill="#8a4a52"/>
         <ellipse cx="50" cy="49.4" rx="1.9" ry="1.7" fill="#f191a2" stroke="none"/>
       </g>`
    : `<path d="M46.6 45.4 Q48.3 47.1 50 45.7 Q51.7 47.1 53.4 45.4" fill="none" stroke="${OUT}" stroke-width="1.3" stroke-linecap="round"/>`;

  const whiskers = `
    <g stroke="rgba(74,59,54,0.5)" stroke-width="1" stroke-linecap="round" fill="none">
      <path d="M25.5 39.5 Q17 38 11.5 38.5"/>
      <path d="M25.8 43 Q17.5 43.5 12.5 45.5"/>
      <path d="M74.5 39.5 Q83 38 88.5 38.5"/>
      <path d="M74.2 43 Q82.5 43.5 87.5 45.5"/>
    </g>`;

  const blush = `
    <ellipse cx="33.2" cy="42.6" rx="3.7" ry="2.3" fill="${c.cheek}" opacity="${female ? 0.75 : 0.5}"/>
    <ellipse cx="66.8" cy="42.6" rx="3.7" ry="2.3" fill="${c.cheek}" opacity="${female ? 0.75 : 0.5}"/>`;

  const flowerAcc =
    female && outfit !== 'flowercrown' && outfit !== 'tophat' && outfit !== 'dress'
      ? flowerSvg(67.5, 12.5, 3.4, '#f290b2')
      : '';

  let headWear = '';
  if (outfit === 'flowercrown') {
    headWear =
      flowerSvg(38, 12.2, 3, '#f290b2') +
      flowerSvg(46, 10.4, 3, '#ffd98a') +
      flowerSvg(54, 10.4, 3, '#f290b2') +
      flowerSvg(62, 12.2, 3, '#ffd98a');
  } else if (outfit === 'tophat') {
    headWear = `
      <g transform="rotate(-4 50 10)" stroke="#26262e" stroke-width="2" stroke-linejoin="round">
        <rect x="38" y="-6" width="24" height="17" rx="2.4" fill="#3a3a44"/>
        <rect x="33" y="9" width="34" height="4.6" rx="2.3" fill="#3a3a44"/>
        <rect x="38" y="4.5" width="24" height="4.6" rx="1.6" fill="#e75f96" stroke="#c94f80"/>
      </g>`;
  } else if (outfit === 'dress') {
    headWear = flowerSvg(42, 11.4, 2.8, '#f290b2') + flowerSvg(50, 9.8, 2.8, '#f6b8cc') + flowerSvg(58, 11.4, 2.8, '#f290b2');
  }

  const neckWear = outfit === 'bowtie' ? bowSvg(50, 54.5, 1.15, '#5aa7e8', '#3f7dbd') : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    ${veil}
    ${tail}
    ${body}
    ${backFeet}
    ${frontLegs}
    ${outfitTorso}
    ${earL}${earR}
    ${head}
    ${headPatchSvg}
    ${stripes}
    ${eyes}
    ${blush}
    ${muzzle}
    ${mouth}
    ${whiskers}
    ${neckWear}
    ${flowerAcc}
    ${headWear}
  </svg>`;
};

/* --------------------------- shared quad pieces --------------------------- */

function quadBodySvg(c: { body: string; belly: string }, pawFill?: string, legFill?: string): string {
  const paw = pawFill ?? c.belly;
  const legs = legFill
    ? `<g fill="${legFill}" stroke="${OUT}" stroke-width="2">
         <path d="M41 60 C40.5 68 40.5 77 41 84 L48 84 C48.4 77 48.4 68 48 60 Z"/>
         <path d="M52 60 C51.6 68 51.6 77 52 84 L59 84 C59.5 77 59.5 68 59 60 Z"/>
       </g>`
    : `<g stroke="${OUT}" stroke-width="1.4" opacity="0.55" fill="none" stroke-linecap="round">
         <path d="M44.6 65 C44.3 71 44.3 78 44.6 83"/>
         <path d="M55.4 65 C55.7 71 55.7 78 55.4 83"/>
       </g>`;
  return `
    <path d="M36.5 50 C31 58 27.5 68 27.5 78.5 C27.5 87.5 34 91.5 50 91.5 C66 91.5 72.5 87.5 72.5 78.5 C72.5 68 69 58 63.5 50 Z" fill="${c.body}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M33.2 63 C29.8 70.5 30 79.5 33.6 86.5" fill="none" stroke="${OUT}" stroke-width="1.4" opacity="0.5" stroke-linecap="round"/>
    <path d="M66.8 63 C70.2 70.5 70 79.5 66.4 86.5" fill="none" stroke="${OUT}" stroke-width="1.4" opacity="0.5" stroke-linecap="round"/>
    <ellipse cx="50" cy="56.5" rx="9.5" ry="3.4" fill="rgba(120,95,80,0.14)"/>
    <g fill="${paw}" stroke="${OUT}" stroke-width="1.8">
      <path d="M25.5 86.5 a5.6 4.4 0 1 0 11 1.4 l-.4 -3.4 Z"/>
      <path d="M74.5 86.5 a5.6 4.4 0 1 1 -11 1.4 l.4 -3.4 Z"/>
    </g>
    ${legs}
    <g fill="${paw}" stroke="${OUT}" stroke-width="1.8">
      <ellipse cx="43.8" cy="87.4" rx="5.4" ry="4.2"/>
      <ellipse cx="56.2" cy="87.4" rx="5.4" ry="4.2"/>
    </g>
    <path d="M42.2 88.6 L42.2 91.1 M45.4 88.9 L45.4 91.4 M54.6 88.9 L54.6 91.4 M57.8 88.6 L57.8 91.1 M29.5 88.2 L29.5 90.7 M32.8 88.6 L32.8 91.1 M70.5 88.2 L70.5 90.7 M67.2 88.6 L67.2 91.1" stroke="${OUT}" stroke-width="1.1" stroke-linecap="round"/>`;
}

function birdBodySvg(c: { body: string; belly: string; accent: string }, sing: boolean, footFill: string): string {
  const flap = sing ? -3 : 0;
  return `
    <g stroke="${OUT}" stroke-width="2" stroke-linejoin="round">
      <ellipse cx="26" cy="${66 + flap}" rx="7" ry="11.5" fill="${c.accent}" transform="rotate(-18 26 ${66 + flap})"/>
      <ellipse cx="74" cy="${66 + flap}" rx="7" ry="11.5" fill="${c.accent}" transform="rotate(18 74 ${66 + flap})"/>
    </g>
    <path d="M36.5 50 C31.5 57 28.5 66 28.5 76 C28.5 86 35 91 50 91 C65 91 71.5 86 71.5 76 C71.5 66 68.5 57 63.5 50 Z" fill="${c.body}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
    <ellipse cx="50" cy="74" rx="12" ry="11" fill="${c.belly}"/>
    <g fill="${footFill}" stroke="${OUT}" stroke-width="1.8">
      <ellipse cx="42" cy="89.5" rx="5.4" ry="3.4"/>
      <ellipse cx="58" cy="89.5" rx="5.4" ry="3.4"/>
    </g>
    <path d="M40.2 90.3 L40.2 92 M43.6 90.6 L43.6 92.2 M56.4 90.6 L56.4 92.2 M59.8 90.3 L59.8 92" stroke="${OUT}" stroke-width="1" stroke-linecap="round"/>`;
}

function headBaseSvg(fill: string): string {
  return `
    <path d="M27.5 34
      C27.5 20.5 33.5 13 50 13
      C66.5 13 72.5 20.5 72.5 34
      C72.5 40.5 71 45.5 66.5 48.8
      C69 49.3 70.5 50.2 71.5 51.5
      C69 51.8 66.8 51.6 64.8 50.9
      C60.7 53 55.7 54 50 54
      C44.3 54 39.3 53 35.2 50.9
      C33.2 51.6 31 51.8 28.5 51.5
      C29.5 50.2 31 49.3 33.5 48.8
      C29 45.5 27.5 40.5 27.5 34 Z"
      fill="${fill}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>`;
}

function beanEyesSvg(dx: number, y: number, r: number, female: boolean): string {
  const x1 = 50 - dx;
  const x2 = 50 + dx;
  return `
    <g fill="${OUT}">
      <ellipse cx="${x1}" cy="${y}" rx="${r * 0.78}" ry="${r}"/>
      <ellipse cx="${x2}" cy="${y}" rx="${r * 0.78}" ry="${r}"/>
    </g>
    <circle cx="${x1 - r * 0.28}" cy="${y - r * 0.4}" r="${r * 0.3}" fill="#ffffff"/>
    <circle cx="${x2 - r * 0.28}" cy="${y - r * 0.4}" r="${r * 0.3}" fill="#ffffff"/>
    ${
      female
        ? `<g stroke="${OUT}" stroke-width="1.1" stroke-linecap="round">
             <path d="M${x1 - r * 0.8} ${y - r * 0.8} L${x1 - r * 1.4} ${y - r * 1.3}"/>
             <path d="M${x1 - r} ${y - r * 0.2} L${x1 - r * 1.7} ${y - r * 0.5}"/>
             <path d="M${x2 + r * 0.8} ${y - r * 0.8} L${x2 + r * 1.4} ${y - r * 1.3}"/>
             <path d="M${x2 + r} ${y - r * 0.2} L${x2 + r * 1.7} ${y - r * 0.5}"/>
           </g>`
        : ''
    }`;
}

function blushSvg(cheek: string, female: boolean, y = 42.6, dx = 16.8): string {
  return `
    <ellipse cx="${50 - dx}" cy="${y}" rx="3.7" ry="2.3" fill="${cheek}" opacity="${female ? 0.75 : 0.5}"/>
    <ellipse cx="${50 + dx}" cy="${y}" rx="3.7" ry="2.3" fill="${cheek}" opacity="${female ? 0.75 : 0.5}"/>`;
}

function singMouthSvg(y = 47.6): string {
  return `<g stroke="${OUT}" stroke-width="1.3">
    <ellipse cx="50" cy="${y}" rx="3.3" ry="4.1" fill="#8a4a52"/>
    <ellipse cx="50" cy="${y + 1.8}" rx="1.9" ry="1.7" fill="#f191a2" stroke="none"/>
  </g>`;
}

function outfitTorsoSvg(outfit: OutfitId): string {
  if (outfit === 'tuxedo') {
    return `
      <path d="M37.5 52 C32.5 59.5 29.5 68.5 29.5 78 C29.5 85.8 35.5 89.5 50 89.5 C64.5 89.5 70.5 85.8 70.5 78 C70.5 68.5 67.5 59.5 62.5 52 Z" fill="#3a3a44" stroke="#26262e" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M43.5 52.5 L56.5 52.5 L50 68 Z" fill="#ffffff" stroke="#d8d4dc" stroke-width="1.3"/>
      <circle cx="50" cy="72" r="1.1" fill="#1e1e26"/>
      <circle cx="50" cy="77.5" r="1.1" fill="#1e1e26"/>
      ${bowSvg(50, 54.5, 0.95, '#26262e', '#15151b')}`;
  }
  if (outfit === 'dress') {
    return `
      <path d="M38 55 C30 66 25 78 24.5 87.5 C33 91 43 92 50 92 C57 92 67 91 75.5 87.5 C75 78 70 66 62 55 Z" fill="#ffffff" stroke="#dcc8d2" stroke-width="2" stroke-linejoin="round"/>
      <path d="M28 88.5 a5 4 0 0 0 9 .8 a5 4 0 0 0 9 .5 a5 4 0 0 0 8 0 a5 4 0 0 0 9 -.5 a5 4 0 0 0 9 -.8" fill="none" stroke="#ecd6e2" stroke-width="1.4"/>
      ${bowSvg(50, 60, 1.05, '#f5a8c2', '#d987a3')}`;
  }
  if (outfit === 'scarf') {
    return `
      <g stroke="#b8544e" stroke-width="1.8" stroke-linejoin="round">
        <rect x="36" y="51.5" width="28" height="6.8" rx="3.4" fill="#e87a7a"/>
        <rect x="52" y="56" width="7.4" height="14" rx="3.4" fill="#e87a7a"/>
      </g>
      <path d="M53.5 65.5 L58 65.5 M53.5 68 L58 68" stroke="#b8544e" stroke-width="1.1" stroke-linecap="round"/>`;
  }
  return '';
}

function headWearSvg(outfit: OutfitId): string {
  if (outfit === 'flowercrown') {
    return (
      flowerSvg(38, 12.2, 3, '#f290b2') +
      flowerSvg(46, 10.4, 3, '#ffd98a') +
      flowerSvg(54, 10.4, 3, '#f290b2') +
      flowerSvg(62, 12.2, 3, '#ffd98a')
    );
  }
  if (outfit === 'tophat') {
    return `
      <g transform="rotate(-4 50 10)" stroke="#26262e" stroke-width="2" stroke-linejoin="round">
        <rect x="38" y="-6" width="24" height="17" rx="2.4" fill="#3a3a44"/>
        <rect x="33" y="9" width="34" height="4.6" rx="2.3" fill="#3a3a44"/>
        <rect x="38" y="4.5" width="24" height="4.6" rx="1.6" fill="#e75f96" stroke="#c94f80"/>
      </g>`;
  }
  if (outfit === 'dress') {
    return flowerSvg(42, 11.4, 2.8, '#f290b2') + flowerSvg(50, 9.8, 2.8, '#f6b8cc') + flowerSvg(58, 11.4, 2.8, '#f290b2');
  }
  return '';
}

function veilSvg(outfit: OutfitId): string {
  return outfit === 'dress'
    ? `<path d="M30 22 C18 34 16 62 24 78 C34 84 42 84 46 80 C36 62 36 38 44 20 Z
        M70 22 C82 34 84 62 76 78 C66 84 58 84 54 80 C64 62 64 38 56 20 Z" fill="#ffffff" opacity="0.55"/>`
    : '';
}

function neckWearSvg(outfit: OutfitId): string {
  return outfit === 'bowtie' ? bowSvg(50, 54.5, 1.15, '#5aa7e8', '#3f7dbd') : '';
}

function femaleFlowerSvg(female: boolean, outfit: OutfitId): string {
  return female && outfit !== 'flowercrown' && outfit !== 'tophat' && outfit !== 'dress'
    ? flowerSvg(67.5, 12.5, 3.4, '#f290b2')
    : '';
}

function wrap(...layers: string[]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${layers.join('')}</svg>`;
}

/* ------------------------------ 7 species ------------------------------- */

const dogTemplate: Template = ({ def, outfit, sing }) => {
  const c = def.colors;
  const female = def.sex === 'f';
  const tail = `
    <path d="M62 82 C73 85 79 81 80 73" fill="none" stroke="${OUT}" stroke-width="11.5" stroke-linecap="round"/>
    <path d="M62 82 C73 85 79 81 80 73" fill="none" stroke="${c.accent}" stroke-width="8.6" stroke-linecap="round"/>`;
  const ears = `
    <g stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round" fill="${c.accent}">
      <path d="M35.5 15.5 C27.5 13.5 22 19 22.5 29 C23 37.5 27 42.5 32 42.5 C36 41 37.5 34 37.5 26 Z"/>
      <path d="M64.5 15.5 C72.5 13.5 78 19 77.5 29 C77 37.5 73 42.5 68 42.5 C64 41 62.5 34 62.5 26 Z"/>
    </g>`;
  const patch = `<clipPath id="dh"><path d="M27.5 34 C27.5 20.5 33.5 13 50 13 C66.5 13 72.5 20.5 72.5 34 C72.5 44 68.5 51 60 53 C56.9 53.8 53.5 54 50 54 C39 54 27.5 48 27.5 34 Z"/></clipPath>
    <ellipse cx="62" cy="30" rx="9.5" ry="11" fill="${c.accent}" opacity="0.55" clip-path="url(#dh)" transform="rotate(14 62 30)"/>`;
  const muzzle = `
    <ellipse cx="50" cy="44.6" rx="9.2" ry="6.2" fill="${c.belly}"/>
    <ellipse cx="50" cy="41.4" rx="2.7" ry="2.1" fill="${OUT}"/>
    <circle cx="49.1" cy="40.8" r="0.65" fill="#ffffff"/>`;
  const mouth = sing
    ? singMouthSvg(48)
    : `<path d="M46.6 45.6 Q48.3 47.3 50 45.9 Q51.7 47.3 53.4 45.6" fill="none" stroke="${OUT}" stroke-width="1.3" stroke-linecap="round"/>`;
  return wrap(
    veilSvg(outfit),
    tail,
    quadBodySvg(c),
    outfitTorsoSvg(outfit),
    headBaseSvg(c.body),
    patch,
    ears,
    beanEyesSvg(10.5, 35.5, 3.1, female),
    blushSvg(c.cheek, female),
    muzzle,
    mouth,
    neckWearSvg(outfit),
    femaleFlowerSvg(female, outfit),
    headWearSvg(outfit),
  );
};

const foxTemplate: Template = ({ def, outfit, sing }) => {
  const c = def.colors;
  const female = def.sex === 'f';
  const tail = `
    <path d="M60 83 C75 87 86 83 88 71 C88.8 66 87 62.5 84 61" fill="none" stroke="${OUT}" stroke-width="14.6" stroke-linecap="round"/>
    <path d="M60 83 C75 87 86 83 88 71 C88.8 66 87 62.5 84 61" fill="none" stroke="${c.body}" stroke-width="11.6" stroke-linecap="round"/>
    <path d="M87.6 67.5 C87.6 65 86.4 62.6 84 61" fill="none" stroke="${c.belly}" stroke-width="11.6" stroke-linecap="round"/>`;
  const ears = `
    <g stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round">
      <path d="M29.5 24 C25.5 13.5 27.5 5.5 32.5 2.8 C38.5 6 43.5 12 45.2 17.8 C40 20.5 34 23 29.5 24 Z" fill="${c.body}"/>
      <path d="M70.5 24 C74.5 13.5 72.5 5.5 67.5 2.8 C61.5 6 56.5 12 54.8 17.8 C60 20.5 66 23 70.5 24 Z" fill="${c.body}"/>
      <path d="M32.3 18.5 C30.5 12.6 31.4 8.6 33.4 6.6 C36.8 9 39.6 12.6 40.7 16.2 C37.7 17.6 34.8 18.3 32.3 18.5 Z" fill="${def.colors.detail}" stroke="none" opacity="0.85"/>
      <path d="M67.7 18.5 C69.5 12.6 68.6 8.6 66.6 6.6 C63.2 9 60.4 12.6 59.3 16.2 C62.3 17.6 65.2 18.3 67.7 18.5 Z" fill="${def.colors.detail}" stroke="none" opacity="0.85"/>
    </g>`;
  const mask = `
    <ellipse cx="40" cy="46" rx="9.5" ry="7.5" fill="${c.belly}"/>
    <ellipse cx="60" cy="46" rx="9.5" ry="7.5" fill="${c.belly}"/>`;
  const nose = `
    <ellipse cx="50" cy="42" rx="2.5" ry="1.9" fill="${OUT}"/>
    <circle cx="49.2" cy="41.5" r="0.6" fill="#ffffff"/>`;
  const mouth = sing
    ? singMouthSvg(48)
    : `<path d="M46.6 45.8 Q48.3 47.5 50 46.1 Q51.7 47.5 53.4 45.8" fill="none" stroke="${OUT}" stroke-width="1.3" stroke-linecap="round"/>`;
  const whiskers = `
    <g stroke="rgba(74,59,54,0.5)" stroke-width="1" stroke-linecap="round" fill="none">
      <path d="M26 41 Q17.5 39.5 12.5 40"/><path d="M26.3 44.5 Q18 45 13.5 47"/>
      <path d="M74 41 Q82.5 39.5 87.5 40"/><path d="M73.7 44.5 Q82 45 86.5 47"/>
    </g>`;
  return wrap(
    veilSvg(outfit),
    tail,
    quadBodySvg(c),
    outfitTorsoSvg(outfit),
    ears,
    headBaseSvg(c.body),
    mask,
    beanEyesSvg(11.5, 35.5, 3, female),
    blushSvg(c.cheek, female),
    nose,
    mouth,
    whiskers,
    neckWearSvg(outfit),
    femaleFlowerSvg(female, outfit),
    headWearSvg(outfit),
  );
};

const pandaTemplate: Template = ({ def, outfit, sing }) => {
  const c = def.colors;
  const female = def.sex === 'f';
  const dark = c.accent;
  const ears = `
    <circle cx="33" cy="13.5" r="8.2" fill="${dark}" stroke="${OUT}" stroke-width="2.2"/>
    <circle cx="67" cy="13.5" r="8.2" fill="${dark}" stroke="${OUT}" stroke-width="2.2"/>`;
  const patches = `
    <ellipse cx="40" cy="36" rx="5.4" ry="6.8" fill="${dark}" transform="rotate(-12 40 36)"/>
    <ellipse cx="60" cy="36" rx="5.4" ry="6.8" fill="${dark}" transform="rotate(12 60 36)"/>`;
  const eyes = `
    <ellipse cx="40.5" cy="36.5" rx="2" ry="2.6" fill="#1c1c22"/>
    <ellipse cx="59.5" cy="36.5" rx="2" ry="2.6" fill="#1c1c22"/>
    <circle cx="39.8" cy="35.6" r="0.8" fill="#ffffff"/>
    <circle cx="58.8" cy="35.6" r="0.8" fill="#ffffff"/>
    ${
      female
        ? `<g stroke="${OUT}" stroke-width="1.1" stroke-linecap="round">
            <path d="M36.6 32.8 L34.8 31.4"/><path d="M63.4 32.8 L65.2 31.4"/>
          </g>`
        : ''
    }`;
  const muzzle = `
    <ellipse cx="50" cy="43.4" rx="2.6" ry="2" fill="${OUT}"/>
    <circle cx="49.2" cy="42.9" r="0.6" fill="#ffffff"/>`;
  const mouth = sing
    ? singMouthSvg(48.5)
    : `<path d="M50 45.4 L50 46.6 M47.6 48 Q50 49.8 52.4 48" fill="none" stroke="${OUT}" stroke-width="1.3" stroke-linecap="round"/>`;
  return wrap(
    veilSvg(outfit),
    quadBodySvg(c, shade(dark, 1.5), dark),
    outfitTorsoSvg(outfit),
    ears,
    headBaseSvg(c.body),
    patches,
    eyes,
    blushSvg(c.cheek, female, 43.5),
    muzzle,
    mouth,
    neckWearSvg(outfit),
    femaleFlowerSvg(female, outfit),
    headWearSvg(outfit),
  );
};

const frogTemplate: Template = ({ def, outfit, sing }) => {
  const c = def.colors;
  const female = def.sex === 'f';
  const bumps = `
    <circle cx="36" cy="14.5" r="8.4" fill="${c.body}" stroke="${OUT}" stroke-width="2.2"/>
    <circle cx="64" cy="14.5" r="8.4" fill="${c.body}" stroke="${OUT}" stroke-width="2.2"/>`;
  const eyes = `
    <ellipse cx="36" cy="14.5" rx="2.9" ry="3.5" fill="${OUT}"/>
    <ellipse cx="64" cy="14.5" rx="2.9" ry="3.5" fill="${OUT}"/>
    <circle cx="35" cy="13.2" r="1" fill="#ffffff"/>
    <circle cx="63" cy="13.2" r="1" fill="#ffffff"/>
    ${
      female
        ? `<g stroke="${OUT}" stroke-width="1.1" stroke-linecap="round">
            <path d="M32.6 12.2 L30.8 10.8"/><path d="M67.4 12.2 L69.2 10.8"/>
          </g>`
        : ''
    }`;
  const face = `
    <circle cx="46.5" cy="34" r="0.9" fill="${OUT}"/>
    <circle cx="53.5" cy="34" r="0.9" fill="${OUT}"/>`;
  const mouth = sing
    ? `<g stroke="${OUT}" stroke-width="1.4">
        <ellipse cx="50" cy="43" rx="6" ry="5.2" fill="#5c8a52"/>
        <ellipse cx="50" cy="45.4" rx="3.2" ry="2.4" fill="#f191a2" stroke="none"/>
      </g>`
    : `<path d="M40 40.5 Q50 47.5 60 40.5" fill="none" stroke="${OUT}" stroke-width="1.5" stroke-linecap="round"/>`;
  return wrap(
    veilSvg(outfit),
    quadBodySvg(c, c.body),
    outfitTorsoSvg(outfit),
    bumps,
    headBaseSvg(c.body),
    eyes,
    face,
    blushSvg(c.cheek, female, 41),
    mouth,
    neckWearSvg(outfit),
    femaleFlowerSvg(female, outfit),
    headWearSvg(outfit),
  );
};

const chickTemplate: Template = ({ def, outfit, sing }) => {
  const c = def.colors;
  const female = def.sex === 'f';
  const sprigs = `
    <g stroke="${OUT}" stroke-width="1.6" stroke-linecap="round" fill="none">
      <path d="M46 13.5 Q42 7.5 38.5 6.5"/>
      <path d="M50 13 Q50 6 48.5 3.5"/>
      <path d="M54 13.5 Q58 7.5 61.5 6.5"/>
    </g>`;
  const beak = sing
    ? `<g stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round">
        <path d="M44.5 40.5 Q50 37.5 55.5 40.5 Q50 43 44.5 40.5 Z" fill="${c.accent}"/>
        <path d="M45.5 41.8 Q50 48.5 54.5 41.8 Q50 43.4 45.5 41.8 Z" fill="${shade(c.accent, 0.85)}"/>
      </g>`
    : `<path d="M45 40.8 Q50 37.6 55 40.8 Q50 45.2 45 40.8 Z" fill="${c.accent}" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>`;
  return wrap(
    veilSvg(outfit),
    birdBodySvg(c, sing, c.accent),
    outfitTorsoSvg(outfit),
    sprigs,
    headBaseSvg(c.body),
    beanEyesSvg(10.5, 35, 3, female),
    blushSvg(c.cheek, female, 41.5),
    beak,
    neckWearSvg(outfit),
    femaleFlowerSvg(female, outfit),
    headWearSvg(outfit),
  );
};

const duckTemplate: Template = ({ def, outfit, sing }) => {
  const c = def.colors;
  const female = def.sex === 'f';
  const tailFlick = `
    <path d="M28 78 C21 74 18.5 78 21 83 C23 86 27 86.5 31 84.5 Z" fill="${c.body}" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>`;
  const swoosh = `
    <path d="M50 13 Q55 8.5 60.5 10.5" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>`;
  const bill = sing
    ? `<g stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round">
        <path d="M40.5 40.5 Q50 36.5 59.5 40.5 Q50 44 40.5 40.5 Z" fill="#f5a95e"/>
        <path d="M42 42 Q50 49.5 58 42 Q50 44.4 42 42 Z" fill="#e8954a"/>
      </g>`
    : `<g stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round">
        <path d="M40.5 40.8 Q50 36.6 59.5 40.8 Q50 45.8 40.5 40.8 Z" fill="#f5a95e"/>
        <path d="M43 43.4 Q50 45.8 57 43.4" fill="none" stroke-width="1.2"/>
      </g>`;
  return wrap(
    veilSvg(outfit),
    tailFlick,
    birdBodySvg(c, sing, '#f5a95e'),
    outfitTorsoSvg(outfit),
    swoosh,
    headBaseSvg(c.body),
    beanEyesSvg(11.5, 34.5, 3, female),
    blushSvg(c.cheek, female, 41.5),
    bill,
    neckWearSvg(outfit),
    femaleFlowerSvg(female, outfit),
    headWearSvg(outfit),
  );
};

const owlTemplate: Template = ({ def, outfit, sing }) => {
  const c = def.colors;
  const female = def.sex === 'f';
  const tufts = `
    <g stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round" fill="${c.accent}">
      <path d="M31 21.5 C28 15 28.5 9 31.5 5.5 C35.5 8.5 38.5 13 39.5 17.5 C36.5 19.5 33.5 20.9 31 21.5 Z"/>
      <path d="M69 21.5 C72 15 71.5 9 68.5 5.5 C64.5 8.5 61.5 13 60.5 17.5 C63.5 19.5 66.5 20.9 69 21.5 Z"/>
    </g>`;
  const scallops = `
    <g fill="none" stroke="${shade(c.accent, 1.08)}" stroke-width="1.1">
      <path d="M40 68 a3.4 3 0 0 0 6.5 .5 a3.4 3 0 0 0 7 0 a3.4 3 0 0 0 6.5 -.5"/>
      <path d="M42.5 74 a3.4 3 0 0 0 7 .4 a3.4 3 0 0 0 8 -.4"/>
    </g>`;
  const disc = `
    <ellipse cx="40" cy="36" rx="10.5" ry="10" fill="${c.belly}"/>
    <ellipse cx="60" cy="36" rx="10.5" ry="10" fill="${c.belly}"/>`;
  const eyes = `
    <ellipse cx="40" cy="36" rx="3.6" ry="4.3" fill="${OUT}"/>
    <ellipse cx="60" cy="36" rx="3.6" ry="4.3" fill="${OUT}"/>
    <circle cx="38.8" cy="34.4" r="1.2" fill="#ffffff"/>
    <circle cx="58.8" cy="34.4" r="1.2" fill="#ffffff"/>
    ${
      female
        ? `<g stroke="${OUT}" stroke-width="1.1" stroke-linecap="round">
            <path d="M35.8 32.4 L33.8 30.9"/><path d="M64.2 32.4 L66.2 30.9"/>
          </g>`
        : ''
    }`;
  const beak = sing
    ? `<path d="M47.4 42.4 Q50 40.9 52.6 42.4 Q51.4 47.8 50 48.4 Q48.6 47.8 47.4 42.4 Z" fill="#e8b45e" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/>`
    : `<path d="M47.4 42.4 Q50 40.9 52.6 42.4 Q51 45.8 50 46.3 Q49 45.8 47.4 42.4 Z" fill="#e8b45e" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/>`;
  return wrap(
    veilSvg(outfit),
    birdBodySvg(c, sing, c.accent),
    scallops,
    outfitTorsoSvg(outfit),
    tufts,
    headBaseSvg(c.body),
    disc,
    eyes,
    blushSvg(c.cheek, female, 44),
    beak,
    neckWearSvg(outfit),
    femaleFlowerSvg(female, outfit),
    headWearSvg(outfit),
  );
};

/* ------------------------------- registry -------------------------------- */

const TEMPLATES: Partial<Record<string, Template>> = {
  cat: catTemplate,
  dog: dogTemplate,
  fox: foxTemplate,
  panda: pandaTemplate,
  frog: frogTemplate,
  chick: chickTemplate,
  duck: duckTemplate,
  owl: owlTemplate,
};

export const SPRITE_META: Partial<Record<string, SpriteMeta>> = {
  cat: { eyes: [[40, 36], [60, 36]], eyeR: 3.2, headFill: 'body' },
  dog: { eyes: [[39.5, 35.5], [60.5, 35.5]], eyeR: 3.1, headFill: 'body' },
  fox: { eyes: [[38.5, 35.5], [61.5, 35.5]], eyeR: 3, headFill: 'body' },
  panda: { eyes: [[40.5, 36.5], [59.5, 36.5]], eyeR: 2.6, headFill: 'accent' },
  frog: { eyes: [[36, 14.5], [64, 14.5]], eyeR: 3.5, headFill: 'body' },
  chick: { eyes: [[39.5, 35], [60.5, 35]], eyeR: 3, headFill: 'body' },
  duck: { eyes: [[38.5, 34.5], [61.5, 34.5]], eyeR: 3, headFill: 'body' },
  owl: { eyes: [[40, 36], [60, 36]], eyeR: 4.3, headFill: 'belly' },
};

const cache = new Map<string, { img: HTMLImageElement; ready: boolean }>();

export interface SpriteResult {
  img: HTMLImageElement;
  /** true when this is user-provided artwork from /characters/ */
  custom: boolean;
}

/**
 * Custom artwork pipeline: PNGs dropped into public/characters/ (via the
 * local admin panel) override the sculpted templates. Naming convention:
 *   <charId>.idle.png   — mouth closed
 *   <charId>.sing.png   — mouth open (falls back to idle if missing)
 */
const custom = new Map<string, { img: HTMLImageElement; state: 'loading' | 'ok' | 'missing' }>();

function customSprite(charId: string, pose: 'idle' | 'sing'): HTMLImageElement | null {
  const key = `${charId}.${pose}`;
  let entry = custom.get(key);
  if (!entry) {
    const img = new Image();
    entry = { img, state: 'loading' };
    custom.set(key, entry);
    img.onload = () => {
      entry!.state = 'ok';
    };
    img.onerror = () => {
      entry!.state = 'missing';
    };
    img.src = `/characters/${key}.png`;
  }
  return entry.state === 'ok' ? entry.img : null;
}

/**
 * User-created characters (premium feature): sprite image comes from a
 * local Blob in IndexedDB rather than the /characters/ folder.
 */
const localSprites = new Map<string, { img: HTMLImageElement; ready: boolean; url: string }>();

export function registerLocalSprite(charId: string, blob: Blob): void {
  const prev = localSprites.get(charId);
  if (prev) URL.revokeObjectURL(prev.url);
  const url = URL.createObjectURL(blob);
  const img = new Image();
  const entry = { img, ready: false, url };
  localSprites.set(charId, entry);
  img.onload = () => {
    entry.ready = true;
  };
  img.src = url;
}

export function unregisterLocalSprite(charId: string): void {
  const prev = localSprites.get(charId);
  if (prev) {
    URL.revokeObjectURL(prev.url);
    localSprites.delete(charId);
  }
}

export function getSprite(
  def: AnimalDef,
  outfit: OutfitId,
  sing: boolean,
): SpriteResult | null {
  // user-created characters draw their own local image
  const local = localSprites.get(def.id);
  if (local) {
    return local.ready ? { img: local.img, custom: true } : null;
  }
  // user artwork wins; sing falls back to the idle frame if not provided
  const art = customSprite(def.id, sing ? 'sing' : 'idle') ?? (sing ? customSprite(def.id, 'idle') : null);
  if (art) return { img: art, custom: true };

  const tpl = TEMPLATES[def.species];
  if (!tpl) return null;
  const key = `${def.id}|${outfit}|${sing ? 1 : 0}`;
  let entry = cache.get(key);
  if (!entry) {
    const img = new Image();
    entry = { img, ready: false };
    cache.set(key, entry);
    img.onload = () => {
      entry!.ready = true;
    };
    img.src =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(tpl({ def, outfit, sing }));
  }
  return entry.ready ? { img: entry.img, custom: false } : null;
}

/**
 * Standalone outfit layer, rendered over custom artwork (custom art is
 * normalized to the same 100-unit frame, so standard positions fit).
 */
const overlayCache = new Map<string, { img: HTMLImageElement; ready: boolean }>();

export function getOutfitOverlay(outfit: OutfitId): HTMLImageElement | null {
  if (outfit === 'none') return null;
  let entry = overlayCache.get(outfit);
  if (!entry) {
    const img = new Image();
    entry = { img, ready: false };
    overlayCache.set(outfit, entry);
    img.onload = () => {
      entry!.ready = true;
    };
    img.src =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(wrap(veilSvg(outfit), outfitTorsoSvg(outfit), neckWearSvg(outfit), headWearSvg(outfit)));
  }
  return entry.ready ? entry.img : null;
}

export function hasSprite(def: AnimalDef): boolean {
  return !!TEMPLATES[def.species];
}
