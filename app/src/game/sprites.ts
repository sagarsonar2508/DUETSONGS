/**
 * Hand-sculpted SVG character illustrations — the designer-grade art path.
 *
 * Each species is an individually authored illustration (organic bezier
 * silhouettes, fur tufts, flat cel colors with discrete shade shapes,
 * consistent warm outline) parameterized only by palette and small feature
 * toggles (sex, singing). Rendered to Image sprites and drawn to
 * canvas; characters without a sculpted template fall back to the old
 * parametric renderer.
 */

import type { AnimalDef } from '../data/animals';

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

const catTemplate: Template = ({ def, sing }) => {
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

  const flowerAcc = female ? flowerSvg(67.5, 12.5, 3.4, '#f290b2') : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    ${tail}
    ${body}
    ${backFeet}
    ${frontLegs}
    ${earL}${earR}
    ${head}
    ${headPatchSvg}
    ${stripes}
    ${eyes}
    ${blush}
    ${muzzle}
    ${mouth}
    ${whiskers}
    ${flowerAcc}
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

function femaleFlowerSvg(female: boolean): string {
  return female ? flowerSvg(67.5, 12.5, 3.4, '#f290b2') : '';
}

function wrap(...layers: string[]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${layers.join('')}</svg>`;
}

/* ------------------------------ 7 species ------------------------------- */

const dogTemplate: Template = ({ def, sing }) => {
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
    tail,
    quadBodySvg(c),
    headBaseSvg(c.body),
    patch,
    ears,
    beanEyesSvg(10.5, 35.5, 3.1, female),
    blushSvg(c.cheek, female),
    muzzle,
    mouth,
    femaleFlowerSvg(female),
  );
};

const foxTemplate: Template = ({ def, sing }) => {
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
    tail,
    quadBodySvg(c),
    ears,
    headBaseSvg(c.body),
    mask,
    beanEyesSvg(11.5, 35.5, 3, female),
    blushSvg(c.cheek, female),
    nose,
    mouth,
    whiskers,
    femaleFlowerSvg(female),
  );
};

const pandaTemplate: Template = ({ def, sing }) => {
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
    quadBodySvg(c, shade(dark, 1.5), dark),
    ears,
    headBaseSvg(c.body),
    patches,
    eyes,
    blushSvg(c.cheek, female, 43.5),
    muzzle,
    mouth,
    femaleFlowerSvg(female),
  );
};

const frogTemplate: Template = ({ def, sing }) => {
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
    quadBodySvg(c, c.body),
    bumps,
    headBaseSvg(c.body),
    eyes,
    face,
    blushSvg(c.cheek, female, 41),
    mouth,
    femaleFlowerSvg(female),
  );
};

const chickTemplate: Template = ({ def, sing }) => {
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
    birdBodySvg(c, sing, c.accent),
    sprigs,
    headBaseSvg(c.body),
    beanEyesSvg(10.5, 35, 3, female),
    blushSvg(c.cheek, female, 41.5),
    beak,
    femaleFlowerSvg(female),
  );
};

const duckTemplate: Template = ({ def, sing }) => {
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
    tailFlick,
    birdBodySvg(c, sing, '#f5a95e'),
    swoosh,
    headBaseSvg(c.body),
    beanEyesSvg(11.5, 34.5, 3, female),
    blushSvg(c.cheek, female, 41.5),
    bill,
    femaleFlowerSvg(female),
  );
};

const owlTemplate: Template = ({ def, sing }) => {
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
    birdBodySvg(c, sing, c.accent),
    scallops,
    tufts,
    headBaseSvg(c.body),
    disc,
    eyes,
    blushSvg(c.cheek, female, 44),
    beak,
    femaleFlowerSvg(female),
  );
};

/* --------------------------- non-animal stars ---------------------------- */

const ghostTemplate: Template = ({ def, sing }) => {
  const c = def.colors;
  const female = def.sex === 'f';
  // one soft sheet: dome head flowing into a scalloped floating hem
  const body = `
    <path d="M27 42
      C27 20 36 10 50 10
      C64 10 73 20 73 42
      L73 76
      C73 80 70 83 66.5 82
      C63.5 81.2 62 84.5 58.5 85.5
      C55 86.5 53 83.5 50 83.5
      C47 83.5 45 86.5 41.5 85.5
      C38 84.5 36.5 81.2 33.5 82
      C30 83 27 80 27 76 Z"
      fill="${c.body}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M31.5 44 C31.5 66 31.5 72 31.8 77" stroke="${OUT}" stroke-width="1.3" opacity="0.4" fill="none" stroke-linecap="round"/>
    <path d="M68.5 44 C68.5 66 68.5 72 68.2 77" stroke="${OUT}" stroke-width="1.3" opacity="0.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="50" cy="60" rx="13" ry="14" fill="${c.belly}" opacity="0.65"/>`;
  const arms = `
    <g fill="${c.body}" stroke="${OUT}" stroke-width="2" stroke-linejoin="round">
      <path d="M27.5 52 C21 54 18.5 59 20.5 63 C25 63.5 28.5 61 30.5 57.5 Z"/>
      <path d="M72.5 52 C79 54 81.5 59 79.5 63 C75 63.5 71.5 61 69.5 57.5 Z"/>
    </g>`;
  const wisp = `
    <path d="M50 10 C49 6.5 51.5 4.5 54.5 5" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>`;
  const mouth = sing
    ? singMouthSvg(46)
    : `<path d="M46.6 44.4 Q48.3 46.1 50 44.7 Q51.7 46.1 53.4 44.4" fill="none" stroke="${OUT}" stroke-width="1.3" stroke-linecap="round"/>`;
  return wrap(
    body,
    arms,
    wisp,
    beanEyesSvg(10.5, 37, 3.2, female),
    blushSvg(c.cheek, female, 43.5, 15),
    mouth,
    femaleFlowerSvg(female),
  );
};

const robotTemplate: Template = ({ def, sing }) => {
  const c = def.colors;
  const female = def.sex === 'f';
  const dark = shade(c.body, 0.82);
  const antenna = `
    <path d="M50 13.5 L50 7" stroke="${OUT}" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="50" cy="5.5" r="3" fill="${c.cheek}" stroke="${OUT}" stroke-width="1.8"/>
    ${female ? bowSvg(50, 10.5, 0.85, '#f5a8c2', '#d987a3') : ''}`;
  const head = `
    <rect x="29" y="13.5" width="42" height="31" rx="9" fill="${c.body}" stroke="${OUT}" stroke-width="2.2"/>
    <rect x="35" y="19" width="30" height="17.5" rx="5" fill="${c.detail}" stroke="${OUT}" stroke-width="1.6"/>
    <g stroke="${OUT}" stroke-width="1.6" fill="${dark}">
      <path d="M29 27 L24.5 27 A2.6 2.6 0 1 0 24.5 32 L29 32 Z"/>
      <path d="M71 27 L75.5 27 A2.6 2.6 0 1 0 75.5 32 L71 32 Z"/>
    </g>`;
  const eyes = sing
    ? `<g fill="${c.accent}">
        <path d="M40 28.5 a3.1 3.1 0 0 1 6.2 0 Z" transform="rotate(180 43.1 27.2)"/>
        <path d="M53.8 28.5 a3.1 3.1 0 0 1 6.2 0 Z" transform="rotate(180 56.9 27.2)"/>
      </g>
      <ellipse cx="50" cy="32.4" rx="3" ry="2.6" fill="${c.accent}"/>`
    : `<g fill="${c.accent}">
        <circle cx="43.1" cy="27.5" r="3.1"/>
        <circle cx="56.9" cy="27.5" r="3.1"/>
      </g>
      <circle cx="42" cy="26.4" r="1" fill="#ffffff"/>
      <circle cx="55.8" cy="26.4" r="1" fill="#ffffff"/>
      <path d="M45.5 32.8 Q50 34.8 54.5 32.8" fill="none" stroke="${c.accent}" stroke-width="1.6" stroke-linecap="round"/>`;
  const neck = `<rect x="45.5" y="44.5" width="9" height="4.5" fill="${dark}" stroke="${OUT}" stroke-width="1.6"/>`;
  const torso = `
    <rect x="31" y="48.5" width="38" height="32" rx="8" fill="${c.body}" stroke="${OUT}" stroke-width="2.2"/>
    <rect x="37" y="54" width="26" height="14" rx="4" fill="${c.belly}" stroke="${OUT}" stroke-width="1.4"/>
    ${
      female
        ? `<path d="M50 58.2 C48.5 55.8 45 56.4 45 59 C45 61.2 47.5 62.8 50 64.4 C52.5 62.8 55 61.2 55 59 C55 56.4 51.5 55.8 50 58.2 Z" fill="${c.cheek}" stroke="${OUT}" stroke-width="1.2"/>`
        : `<circle cx="44" cy="61" r="2.2" fill="${c.accent}" stroke="${OUT}" stroke-width="1.2"/>
           <path d="M50 57.5 L58 57.5 M50 61 L58 61 M50 64.5 L55 64.5" stroke="${OUT}" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>`
    }
    <circle cx="38.5" cy="73.5" r="1.6" fill="${c.accent}"/>
    <circle cx="44" cy="73.5" r="1.6" fill="${c.cheek}"/>`;
  const arms = `
    <g fill="${c.body}" stroke="${OUT}" stroke-width="2">
      <rect x="22.5" y="51" width="7.5" height="17" rx="3.6"/>
      <rect x="70" y="51" width="7.5" height="17" rx="3.6"/>
    </g>
    <g fill="${dark}" stroke="${OUT}" stroke-width="1.8">
      <circle cx="26.2" cy="70.5" r="3.6"/>
      <circle cx="73.8" cy="70.5" r="3.6"/>
    </g>`;
  const legs = `
    <g fill="${dark}" stroke="${OUT}" stroke-width="1.8">
      <rect x="38" y="80.5" width="8" height="6.5"/>
      <rect x="54" y="80.5" width="8" height="6.5"/>
    </g>
    <g fill="${c.body}" stroke="${OUT}" stroke-width="1.8">
      <path d="M34.5 91.5 A6.6 5 0 0 1 47.5 91.5 Z"/>
      <path d="M52.5 91.5 A6.6 5 0 0 1 65.5 91.5 Z"/>
    </g>`;
  return wrap(
    antenna,
    legs,
    torso,
    arms,
    neck,
    head,
    eyes,
    blushSvg(c.cheek, female, 39, 15.5),
    femaleFlowerSvg(female),
  );
};

const dragonTemplate: Template = ({ def, sing }) => {
  const c = def.colors;
  const female = def.sex === 'f';
  const wings = `
    <g stroke="${OUT}" stroke-width="2" stroke-linejoin="round" fill="${c.accent}">
      <path d="M28 58 C17 52 13.5 44 16.5 37 C21 39 24 42 25.5 45 C25 41 26.5 38 29.5 36.5 C31.5 40 32.5 45 31.5 49 C33.5 51.5 34 55 33 58.5 Z"/>
      <path d="M72 58 C83 52 86.5 44 83.5 37 C79 39 76 42 74.5 45 C75 41 73.5 38 70.5 36.5 C68.5 40 67.5 45 68.5 49 C66.5 51.5 66 55 67 58.5 Z"/>
    </g>`;
  const tail = `
    <path d="M62 82 C74 85 82 81 84 73" fill="none" stroke="${OUT}" stroke-width="11" stroke-linecap="round"/>
    <path d="M62 82 C74 85 82 81 84 73" fill="none" stroke="${c.body}" stroke-width="8.2" stroke-linecap="round"/>
    <path d="M84.5 76 L89 66.5 L79.5 68.5 Z" fill="${c.cheek}" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>`;
  const horns = `
    <g fill="${c.belly}" stroke="${OUT}" stroke-width="1.9" stroke-linejoin="round">
      <path d="M35 16.5 C33 11.5 34 6.5 37.5 4 C39.5 8 40 12.5 39 16.2 Z"/>
      <path d="M65 16.5 C67 11.5 66 6.5 62.5 4 C60.5 8 60 12.5 61 16.2 Z"/>
    </g>`;
  const crest = `
    <g fill="${c.accent}" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round">
      <path d="M46 13.6 L48.5 8.5 L51 13.4 Z"/>
      <path d="M52.5 13.4 L55.5 9 L57.5 13.8 Z"/>
    </g>`;
  const snout = `
    <ellipse cx="50" cy="44.8" rx="10.5" ry="6.6" fill="${c.belly}"/>
    <g fill="${OUT}">
      <ellipse cx="46.6" cy="42.6" rx="1.15" ry="1.5"/>
      <ellipse cx="53.4" cy="42.6" rx="1.15" ry="1.5"/>
    </g>`;
  const mouth = sing
    ? `<g stroke="${OUT}" stroke-width="1.3">
        <ellipse cx="50" cy="48" rx="3.6" ry="4" fill="#8a4a52"/>
        <ellipse cx="50" cy="49.6" rx="2" ry="1.7" fill="#f191a2" stroke="none"/>
        <path d="M46.2 46.3 L47.4 47.8 M53.8 46.3 L52.6 47.8" stroke-width="1.1"/>
      </g>`
    : `<path d="M46.2 46.4 Q48.1 48.2 50 46.8 Q51.9 48.2 53.8 46.4" fill="none" stroke="${OUT}" stroke-width="1.3" stroke-linecap="round"/>
       <path d="M45.4 45.2 L46.4 46.8" stroke="${OUT}" stroke-width="1.1" stroke-linecap="round"/>`;
  const bellyScales = `
    <g fill="none" stroke="${shade(c.belly, 0.8)}" stroke-width="1.1" opacity="0.8">
      <path d="M42 70 a4.2 3.4 0 0 0 8 .5 a4.2 3.4 0 0 0 8 -.5"/>
      <path d="M43.5 76.5 a4.2 3.4 0 0 0 6.8 .4 a4.2 3.4 0 0 0 6.8 -.4"/>
      <path d="M45 83 a4.2 3.4 0 0 0 5.2 .3 a4.2 3.4 0 0 0 5.2 -.3"/>
    </g>`;
  return wrap(
    wings,
    tail,
    quadBodySvg(c, c.belly),
    bellyScales,
    horns,
    crest,
    headBaseSvg(c.body),
    beanEyesSvg(10.5, 35.5, 3, female),
    blushSvg(c.cheek, female),
    snout,
    mouth,
    femaleFlowerSvg(female),
  );
};

const starTemplate: Template = ({ def, sing }) => {
  const c = def.colors;
  const female = def.sex === 'f';
  const legs = `
    <g stroke="${OUT}" stroke-width="1.5" opacity="0.6" fill="none" stroke-linecap="round">
      <path d="M42.5 76 C42.2 80 42.2 83 42.5 85.5"/>
      <path d="M57.5 76 C57.8 80 57.8 83 57.5 85.5"/>
    </g>
    <g fill="${c.belly}" stroke="${OUT}" stroke-width="1.8">
      <ellipse cx="42" cy="88" rx="5.2" ry="3.8"/>
      <ellipse cx="58" cy="88" rx="5.2" ry="3.8"/>
    </g>
    <path d="M40.4 89.2 L40.4 91.4 M43.6 89.5 L43.6 91.6 M56.4 89.5 L56.4 91.6 M59.6 89.2 L59.6 91.4" stroke="${OUT}" stroke-width="1" stroke-linecap="round"/>`;
  const body = `
    <path d="M50 11
      L59.5 33.2 L83.5 35.4
      C85.8 35.6 86.5 38 84.8 39.5
      L66.7 55.4 L72 78.9
      C72.5 81.2 70.5 82.7 68.5 81.5
      L50 69.4 L31.5 81.5
      C29.5 82.7 27.5 81.2 28 78.9
      L33.3 55.4 L15.2 39.5
      C13.5 38 14.2 35.6 16.5 35.4
      L40.5 33.2 Z"
      fill="${c.body}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M50 18 L56 32 L44 32 Z" fill="${c.belly}" opacity="0.55"/>
    <circle cx="21.5" cy="38.5" r="1.4" fill="#ffffff" opacity="0.85"/>
    <circle cx="78.5" cy="38.5" r="1.4" fill="#ffffff" opacity="0.85"/>
    <circle cx="50" cy="15.5" r="1.4" fill="#ffffff" opacity="0.85"/>`;
  const mouth = sing
    ? singMouthSvg(52)
    : `<path d="M46.4 50.6 Q48.2 52.4 50 51 Q51.8 52.4 53.6 50.6" fill="none" stroke="${OUT}" stroke-width="1.3" stroke-linecap="round"/>`;
  const sparkles = `
    <g fill="${shade(c.accent, 1.25)}" opacity="0.9">
      <path d="M69 22 L70.2 25 L73.2 26.2 L70.2 27.4 L69 30.4 L67.8 27.4 L64.8 26.2 L67.8 25 Z"/>
      <path d="M27 62 L27.9 64.2 L30.1 65.1 L27.9 66 L27 68.2 L26.1 66 L23.9 65.1 L26.1 64.2 Z"/>
    </g>`;
  return wrap(
    legs,
    body,
    sparkles,
    beanEyesSvg(9, 44.5, 2.9, female),
    blushSvg(c.cheek, female, 50.5, 13.5),
    mouth,
    femaleFlowerSvg(female),
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
  ghost: ghostTemplate,
  robot: robotTemplate,
  dragon: dragonTemplate,
  star: starTemplate,
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
  ghost: { eyes: [[39.5, 37], [60.5, 37]], eyeR: 3.2, headFill: 'body' },
  dragon: { eyes: [[39.5, 35.5], [60.5, 35.5]], eyeR: 3, headFill: 'body' },
  star: { eyes: [[41, 44.5], [59, 44.5]], eyeR: 2.9, headFill: 'body' },
  // robot has screen eyes — no organic blink overlay
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
 * User-created characters (premium feature): sprite images come from local
 * Blobs in IndexedDB rather than the /characters/ folder. Two frames:
 * idle (required) and singing (optional — falls back to idle).
 */
interface LocalFrame {
  img: HTMLImageElement;
  ready: boolean;
  url: string;
}

const localSprites = new Map<string, { idle: LocalFrame; sing: LocalFrame | null }>();

function loadFrame(blob: Blob): LocalFrame {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  const frame: LocalFrame = { img, ready: false, url };
  img.onload = () => {
    frame.ready = true;
  };
  img.src = url;
  return frame;
}

export function registerLocalSprite(charId: string, idle: Blob, sing: Blob | null = null): void {
  unregisterLocalSprite(charId);
  localSprites.set(charId, {
    idle: loadFrame(idle),
    sing: sing ? loadFrame(sing) : null,
  });
}

export function unregisterLocalSprite(charId: string): void {
  const prev = localSprites.get(charId);
  if (prev) {
    URL.revokeObjectURL(prev.idle.url);
    if (prev.sing) URL.revokeObjectURL(prev.sing.url);
    localSprites.delete(charId);
  }
}

export function getSprite(def: AnimalDef, sing: boolean): SpriteResult | null {
  // user-created characters draw their own local images; the singing frame
  // falls back to idle when it wasn't provided (or hasn't decoded yet)
  const local = localSprites.get(def.id);
  if (local) {
    const frame = sing && local.sing?.ready ? local.sing : local.idle;
    return frame.ready ? { img: frame.img, custom: true } : null;
  }
  // user artwork wins; sing falls back to the idle frame if not provided
  const art = customSprite(def.id, sing ? 'sing' : 'idle') ?? (sing ? customSprite(def.id, 'idle') : null);
  if (art) return { img: art, custom: true };

  const tpl = TEMPLATES[def.species];
  if (!tpl) return null;
  const key = `${def.id}|${sing ? 1 : 0}`;
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
      encodeURIComponent(tpl({ def, sing }));
  }
  return entry.ready ? { img: entry.img, custom: false } : null;
}

export function hasSprite(def: AnimalDef): boolean {
  return !!TEMPLATES[def.species];
}

/**
 * Raw SVG markup for a species template — used by the admin studio to
 * preview built-in art (and recolored variants) without a game canvas.
 */
export function templateSvg(def: AnimalDef, sing: boolean): string | null {
  const tpl = TEMPLATES[def.species];
  return tpl ? tpl({ def, sing }) : null;
}
