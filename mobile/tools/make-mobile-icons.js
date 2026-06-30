'use strict';
// Genera mobile/icons/icon-192.png y icon-512.png (mismo avión de papel de la app).
// Uso: node mobile/tools/make-mobile-icons.js
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const C0 = [0x63, 0x66, 0xf1];
const C1 = [0x22, 0xd3, 0xee];
const POLY = [[2, 21], [23, 12], [2, 3], [2, 10], [17, 12], [2, 14]];

function inPoly(px, py) {
  let inside = false;
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const xi = POLY[i][0], yi = POLY[i][1], xj = POLY[j][0], yj = POLY[j][1];
    const hit = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}
function sdRoundRect(px, py, S, r) {
  const h = S / 2;
  const qx = Math.abs(px - h) - (h - r);
  const qy = Math.abs(py - h) - (h - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
function renderSize(S) {
  const F = 4, B = S * F;
  const big = new Uint8ClampedArray(B * B * 4);
  const r = B * 0.22;
  const scale = B * 0.52 / 21;
  const pw = 21 * scale, ph = 18 * scale;
  const tx = (B - pw) / 2 - 2 * scale, ty = (B - ph) / 2 - 3 * scale;
  for (let y = 0; y < B; y++) {
    for (let x = 0; x < B; x++) {
      const i = (B * y + x) << 2;
      if (sdRoundRect(x + 0.5, y + 0.5, B, r) > 0) { big[i + 3] = 0; continue; }
      const t = (x + y) / (2 * (B - 1));
      let R = C0[0] + (C1[0] - C0[0]) * t;
      let G = C0[1] + (C1[1] - C0[1]) * t;
      let Bl = C0[2] + (C1[2] - C0[2]) * t;
      const ux = (x - tx) / scale, uy = (y - ty) / scale;
      if (inPoly(ux, uy)) { R = 255; G = 255; Bl = 255; }
      big[i] = R; big[i + 1] = G; big[i + 2] = Bl; big[i + 3] = 255;
    }
  }
  const png = new PNG({ width: S, height: S });
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let r2 = 0, g2 = 0, b2 = 0, a2 = 0;
      for (let dy = 0; dy < F; dy++) {
        for (let dx = 0; dx < F; dx++) {
          const i = (B * (y * F + dy) + (x * F + dx)) << 2;
          const a = big[i + 3];
          a2 += a; r2 += big[i] * a; g2 += big[i + 1] * a; b2 += big[i + 2] * a;
        }
      }
      const o = (S * y + x) << 2;
      png.data[o + 3] = Math.round(a2 / (F * F));
      if (a2 > 0) {
        png.data[o] = Math.round(r2 / a2);
        png.data[o + 1] = Math.round(g2 / a2);
        png.data[o + 2] = Math.round(b2 / a2);
      }
    }
  }
  return PNG.sync.write(png);
}

const dir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(dir, { recursive: true });
[192, 512].forEach((s) => {
  fs.writeFileSync(path.join(dir, 'icon-' + s + '.png'), renderSize(s));
  console.log('OK icon-' + s + '.png');
});
