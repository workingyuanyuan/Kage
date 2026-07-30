// 產生全域顆粒層的噪點圖：200x200、8-bit 灰階、mean 128、SD 約 74。
//
// 這張圖是設計語言的核心材質，規格不可任意更動：
//   - 以 opacity 0.10、normal 混合疊在 #000 上，合成結果必須是 luma ≈ 12.8（#0D0D0D）
//     且高通殘差 SD 落在 6–14（目標 8）。mean 與 SD 兩者要同時達標，
//     只有近似均勻分布的噪點做得到 —— feTurbulence 的分布太窄（SD ≈ 20），
//     拉寬就會把 mean 一起推高，數學上無解。
//   - 量化到 32 階可讓 PNG 從 64 KB 壓到 40 KB，而 SD 不受影響。
//   - 使用固定種子，重跑產生位元相同的檔案。
//
// 用法：node scripts/make-grain.mjs [輸出路徑]
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SIZE = 200;
const QUANT_STEP = 32;      // 32 階量化，見上方註解
const SEED = 0x31393939;    // "1999"

// mulberry32：小、快、可重現
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const rand = rng(SEED);

// 逐列組裝：每列前綴一個 filter byte 0（None），灰階每像素 1 byte
const raw = Buffer.alloc((SIZE + 1) * SIZE);
let p = 0;
let sum = 0, sum2 = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0;
  for (let x = 0; x < SIZE; x++) {
    const v = Math.min(255, Math.round(Math.floor(rand() * 256) / QUANT_STEP) * QUANT_STEP);
    raw[p++] = v;
    sum += v; sum2 += v * v;
  }
}
const n = SIZE * SIZE;
const mean = sum / n;
const sd = Math.sqrt(sum2 / n - mean * mean);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;    // bit depth
ihdr[9] = 0;    // colour type 0 = greyscale
ihdr[10] = 0;   // compression
ihdr[11] = 0;   // filter
ihdr[12] = 0;   // interlace

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

const out = process.argv[2] ?? 'assets/img/grain-200.png';
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);

// 合成預測：normal 混合、opacity 0.10、底色 #000
const compositeMean = mean * 0.10;
const compositeSD = sd * 0.10;

console.log(`寫入 ${out}`);
console.log(`  尺寸        ${SIZE}x${SIZE}  ${(png.length / 1024).toFixed(1)} KB`);
console.log(`  源 mean/SD  ${mean.toFixed(2)} / ${sd.toFixed(2)}   （目標 128 / 74）`);
console.log(`  合成@0.10   luma ${compositeMean.toFixed(2)} · SD ${compositeSD.toFixed(2)}`);
console.log(`  驗收        mean ${compositeMean >= 8 && compositeMean <= 16 ? 'PASS' : 'FAIL'} (8–16)` +
            `  ·  SD ${compositeSD >= 6 && compositeSD <= 14 ? 'PASS' : 'FAIL'} (6–14)`);
