// 最小 PNG 編解碼器。只用 Node 內建 zlib，不引依賴。
//
// 解碼支援 8-bit、非交錯的 colour type 0/2/4/6（灰階、RGB、灰階+alpha、RGBA），
// 這涵蓋所有瀏覽器截圖與本專案自產的顆粒圖。遇到不支援的格式直接拋錯，
// 不做靜默降級 —— 驗收腳本讀錯格式而算出漂亮數字，比讀不到更糟。
import { deflateSync, inflateSync } from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

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

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** 解碼 PNG，回傳 { width, height, channels, data }（data 為逐像素交錯的 8-bit 樣本）。 */
export function decodePNG(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('不是 PNG 檔');
  let pos = 8, ihdr = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4),
        bitDepth: data[8], colorType: data[9], interlace: data[12]
      };
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (!ihdr) throw new Error('缺少 IHDR');
  const { width, height, bitDepth, colorType, interlace } = ihdr;
  if (bitDepth !== 8) throw new Error(`只支援 8-bit，收到 ${bitDepth}-bit`);
  if (interlace !== 0) throw new Error('不支援交錯 PNG');
  const CH = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!CH) throw new Error(`不支援 colour type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * CH;
  const out = Buffer.alloc(height * stride);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const row = raw.subarray(rp, rp + stride); rp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const up = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= CH ? cur[i - CH] : 0;
      const b = up ? up[i] : 0;
      const c = up && i >= CH ? up[i - CH] : 0;
      let v = row[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      else if (filter !== 0) throw new Error(`未知的 filter ${filter}`);
      cur[i] = v & 0xFF;
    }
  }
  return { width, height, channels: CH, data: out };
}

/** 把解碼結果轉成 Rec.709 luma 的 Float64Array。 */
export function toLuma({ width, height, channels, data }) {
  const n = width * height;
  const out = new Float64Array(n);
  if (channels === 1 || channels === 2) {
    for (let i = 0; i < n; i++) out[i] = data[i * channels];
  } else {
    for (let i = 0; i < n; i++) {
      const p = i * channels;
      out[i] = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
    }
  }
  return out;
}

/** 編碼 8-bit 灰階 PNG。 */
export function encodeGray8(width, height, samples) {
  const raw = Buffer.alloc((width + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0;
    for (let x = 0; x < width; x++) raw[p++] = samples[y * width + x];
  }
  return assemble(width, height, 8, 0, deflateSync(raw, { level: 9 }));
}

/** 編碼 8-bit RGB PNG。 */
export function encodeRGB8(width, height, samples) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0;
    for (let x = 0; x < width * 3; x++) raw[p++] = samples[y * width * 3 + x];
  }
  return assemble(width, height, 8, 2, deflateSync(raw, { level: 9 }));
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function assemble(width, height, bitDepth, colorType, idat) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth; ihdr[9] = colorType;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}
