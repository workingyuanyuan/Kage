// 依規格的數學算出背景四層的合成結果，輸出 PNG。
//
// 兩個用途：
//   1. 給 `kage bg` 當測試夾具 —— 檢查器若在這張圖上全過，檢查器本身是對的。
//   2. 改動漏光參數時先算再看，不必等瀏覽器截圖。
//
//   node scripts/render-bg.mjs [--w 1280] [--h 800] [--tier a|b|c] [--leak .10,.08] [-o out.png]
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePNG, encodeRGB8 } from './lib/png.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };

const W = +arg('--w', 1280);
const H = +arg('--h', 800);
const TIER = String(arg('--tier', 'c')).toLowerCase();
const OUT = arg('-o', `_source/_bg-${TIER}-${W}x${H}.png`);

// 漏光強度依頁型分級，窄螢幕降階（與 BASE 的媒體查詢同一組數值）
const TIERS  = { a: [0.24, 0.19], b: [0.15, 0.12], c: [0.10, 0.08] };
const NARROW = { b: [0.09, 0.07], c: [0.06, 0.05] };      // ≤1023px
if (!TIERS[TIER]) { console.error(`未知分級 ${TIER}，可用 a / b / c`); process.exit(1); }
const [LA, LB] = arg('--leak')
  ? String(arg('--leak')).split(',').map(Number)
  : ((W <= 1023 && NARROW[TIER]) || TIERS[TIER]);

const LEAK = [255, 114, 29];

// 兩道漏光：主漏光錨在右緣外，次漏光錨在左下外
const LAYERS = [
  { rx: Math.min(W * 0.55, 900), ry: H * 0.90, cx: W * 1.04, cy: H * 0.50, a: LA },
  { rx: Math.min(W * 0.45, 760), ry: H * 0.70, cx: -W * 0.06, cy: H * 0.88, a: LB }
];

const screen = (b, s) => 1 - (1 - b) * (1 - s);

// 顆粒圖平鋪
const grain = decodePNG(readFileSync('assets/img/grain-200.png'));
const GW = grain.width, GH = grain.height, GC = grain.channels;
const grainAt = (x, y) => grain.data[((y % GH) * GW + (x % GW)) * GC];

const out = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // 第 1 層：繪製基色純黑
    let c = [0, 0, 0];
    // 第 2 層：暖色漏光，screen 疊加。CSS 的漸層對「含 alpha 的顏色」線性內插，
    // 故 alpha 隨正規化橢圓距離線性衰減至 0。
    for (const L of LAYERS) {
      const dx = (x - L.cx) / L.rx, dy = (y - L.cy) / L.ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= 1) continue;
      const alpha = L.a * (1 - d);
      for (let k = 0; k < 3; k++) {
        const b = c[k] / 255, s = LEAK[k] / 255;
        c[k] = 255 * ((1 - alpha) * b + alpha * screen(b, s));
      }
    }
    // 第 4 層：顆粒，normal 混合、opacity 0.10，永遠最上層
    const g = grainAt(x, y);
    const p = (y * W + x) * 3;
    for (let k = 0; k < 3; k++) out[p + k] = Math.round(0.9 * c[k] + 0.1 * g);
  }
}

writeFileSync(OUT, encodeRGB8(W, H, out));

// 快速自檢：中央應暗於邊緣
const lumaAt = (x, y) => { const p = (y * W + x) * 3;
  return 0.2126 * out[p] + 0.7152 * out[p + 1] + 0.0722 * out[p + 2]; };
const avg = (x0, y0, x1, y1) => { let s = 0, n = 0;
  for (let y = y0 | 0; y < y1; y++) for (let x = x0 | 0; x < x1; x++) { s += lumaAt(x, y); n++; }
  return s / n; };
const centre = avg(W * .4, H * .4, W * .6, H * .6);
const edge = (avg(0, 0, W * .1, H) + avg(W * .9, 0, W, H)) / 2;

console.log(`寫入 ${OUT}`);
console.log(`  ${W}x${H} · ${TIER.toUpperCase()} 級 · 漏光 ${LA} / ${LB}${W <= 1023 ? '（窄螢幕降階）' : ''}`);
console.log(`  中央 ${centre.toFixed(1)} → 邊緣 ${edge.toFixed(1)}  ${centre < edge ? '反向暗角成立' : '*** 方向錯誤 ***'}`);
