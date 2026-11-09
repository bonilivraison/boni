// Génère public/og.png (1200x630) et public/apple-touch-icon.png à partir de SVG.
// Usage : node scripts/og.mjs
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const land = 'M560 0 L560 250 C520 255 480 265 440 285 C390 310 350 335 300 360 C250 385 200 410 160 425 C130 436 105 432 100 418 C95 402 112 388 140 372 C190 343 235 312 280 278 C330 240 370 200 410 150 C440 112 470 60 480 0 Z';
const route = 'M150 396 C210 372 250 345 300 318 S410 250 480 205';
const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#F6EEDF"/>
  <g transform="translate(660 55)">
    <rect width="500" height="520" rx="36" fill="#0C2B3E"/>
    <g transform="scale(.893 1)"><clipPath id="c"><rect width="560" height="520" rx="36"/></clipPath>
    <g clip-path="url(#c)"><path d="${land}" fill="#0F6B3E"/>
    <path d="${route}" fill="none" stroke="#F2B705" stroke-width="6" stroke-linecap="round"/>
    <circle cx="150" cy="396" r="18" fill="#F2B705"/>
    <path transform="translate(480 205)" d="M0 0C-12-14-18-23-18-32a18 18 0 1 1 36 0c0 9-6 18-18 32z" fill="#C8371E" stroke="#F6EEDF" stroke-width="3"/></g></g>
  </g>
  <g transform="translate(70 70)">
    <rect width="64" height="64" rx="18" fill="#C8371E"/>
    <path d="M23 22v18" stroke="#F6EEDF" stroke-width="7" stroke-linecap="round"/>
    <circle cx="34" cy="40" r="11" fill="none" stroke="#F6EEDF" stroke-width="7"/>
    <circle cx="23" cy="13" r="5.5" fill="#F2B705"/><circle cx="34" cy="40" r="3.4" fill="#F2B705"/>
    <text x="82" y="46" font-family="${font}" font-size="40" font-weight="800" fill="#0E1A24" letter-spacing="-1.5">boni<tspan font-weight="400" fill="#C8371E">livraison</tspan></text>
  </g>
  <text x="66" y="300" font-family="${font}" font-size="104" font-weight="800" fill="#0E1A24" letter-spacing="-4">Conakry,</text>
  <text x="66" y="410" font-family="${font}" font-size="104" font-weight="800" fill="#0E1A24" letter-spacing="-4">de A à B.</text>
  <text x="70" y="482" font-family="${font}" font-size="28" fill="#46525C">Colis, documents, repas, achats. Bientôt.</text>
  <rect x="70" y="520" width="300" height="56" rx="28" fill="#C8371E"/>
  <text x="220" y="556" text-anchor="middle" font-family="${font}" font-size="22" font-weight="700" fill="#fff">Rejoindre la liste d’attente</text>
</svg>`;

await sharp(Buffer.from(og)).png().toFile('public/og.png');
const fav = await readFile('public/favicon.svg');
await sharp(fav, { density: 600 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
console.log('ok');
