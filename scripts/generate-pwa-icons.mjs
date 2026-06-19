// Generates PWA icons in /public from an inline SVG. Re-run anytime you
// want to refresh the artwork:
//   node scripts/generate-pwa-icons.mjs
//
// Outputs:
//   public/icon-192.png         (standard PWA icon)
//   public/icon-512.png         (standard PWA icon, splash)
//   public/icon-maskable-512.png(80% safe-zone, full-bleed background)
//   public/apple-touch-icon.png (iOS home-screen, 180x180)
//   public/favicon-32.png       (browser tab)
//   public/favicon-16.png       (browser tab small)

import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve("public");

// Brand: amber → orange → red gradient (matches .gradient-amber in globals.css).
// Icon glyph is a stylized coin stack — same idea as the Coins lucide icon
// in the sidebar header.
const baseSvg = (size, { safeZone = 1, rounded = true } = {}) => {
  // safeZone of 1 = full-bleed; 0.8 = maskable (content inset to inner 80%).
  const inset = ((1 - safeZone) / 2) * size;
  const contentSize = size * safeZone;
  const r = size * 0.18; // corner radius

  // Coin geometry (drawn in a 100x100 viewBox, then translated/scaled).
  const glyphScale = contentSize / 100;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="50%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ef4444"/>
    </linearGradient>
  </defs>
  ${
    rounded
      ? `<rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>`
      : `<rect width="${size}" height="${size}" fill="url(#bg)"/>`
  }
  <g transform="translate(${inset}, ${inset}) scale(${glyphScale})" fill="none" stroke="#0a0a0b" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
    <!-- back coin -->
    <ellipse cx="38" cy="36" rx="26" ry="10" fill="#fde68a"/>
    <path d="M12 36 L12 50 A26 10 0 0 0 64 50 L64 36"/>
    <!-- front coin (overlapping) -->
    <ellipse cx="62" cy="62" rx="26" ry="10" fill="#fde68a"/>
    <path d="M36 62 L36 76 A26 10 0 0 0 88 76 L88 62"/>
    <ellipse cx="62" cy="62" rx="26" ry="10" fill="#fde68a"/>
    <!-- dollar sign on front coin -->
    <text x="62" y="67" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#0a0a0b" stroke="none" text-anchor="middle">$</text>
  </g>
</svg>`.trim();
};

const targets = [
  { name: "icon-192.png", size: 192, safeZone: 1, rounded: true },
  { name: "icon-512.png", size: 512, safeZone: 1, rounded: true },
  { name: "icon-maskable-512.png", size: 512, safeZone: 0.7, rounded: false },
  { name: "apple-touch-icon.png", size: 180, safeZone: 1, rounded: true },
  { name: "favicon-32.png", size: 32, safeZone: 1, rounded: true },
  { name: "favicon-16.png", size: 16, safeZone: 1, rounded: true },
];

for (const t of targets) {
  const svg = baseSvg(t.size, { safeZone: t.safeZone, rounded: t.rounded });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(path.join(OUT_DIR, t.name), png);
  console.log(`✓ ${t.name} (${t.size}x${t.size})`);
}

// Save the raw 512 SVG too — handy for future tweaks.
await writeFile(path.join(OUT_DIR, "icon.svg"), baseSvg(512, { safeZone: 1, rounded: true }));
console.log("✓ icon.svg (source)");
