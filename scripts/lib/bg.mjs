// 背景層的八條像素驗收。輸入是截圖 PNG，輸出是逐條的量測值與判定。
//
// 這八條裡有五條在原始碼裡看不出來（顆粒強度、殘差頻譜、色相分布、
// 明度面積、跨截圖穩定度），只能靠像素統計。這正是本檔存在的理由。
//
// 重要：第 3、7 條是「背景層本身」的規範，前景的米白文字會直接把
// luma≥80 的面積撐爆。量測背景時應截「不含前景元件」的畫面；
// 若截圖含內容，用 --content 模式跳過那兩條。
import { decodePNG, toLuma } from './png.mjs';

/** 積分圖，讓任意尺度的箱形模糊都是 O(1)/像素。 */
function integral(src, w, h) {
  const s = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = 0; x < w; x++) {
      run += src[y * w + x];
      s[(y + 1) * (w + 1) + x + 1] = s[y * (w + 1) + x + 1] + run;
    }
  }
  return s;
}

function boxBlur(src, w, h, radius) {
  const s = integral(src, w, h);
  const out = new Float64Array(w * h);
  const W = w + 1;
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius), y1 = Math.min(h, y + radius + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(w, x + radius + 1);
      const sum = s[y1 * W + x1] - s[y0 * W + x1] - s[y1 * W + x0] + s[y0 * W + x0];
      out[y * w + x] = sum / ((y1 - y0) * (x1 - x0));
    }
  }
  return out;
}

function sd(arr) {
  let s = 0, s2 = 0;
  for (let i = 0; i < arr.length; i++) { s += arr[i]; s2 += arr[i] * arr[i]; }
  const m = s / arr.length;
  return Math.sqrt(Math.max(0, s2 / arr.length - m * m));
}

/** 某一倍頻的殘差：blur(s) − blur(2s)，即 Laplacian 金字塔的一階。 */
function octaveResidual(src, w, h, scale) {
  const a = boxBlur(src, w, h, scale >> 1);
  const b = boxBlur(src, w, h, scale);
  const d = new Float64Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = a[i] - b[i];
  return d;
}

/**
 * 區域的穩健統計：回傳 p1／p99 而非 min／max。
 *
 * 正文欄動輒 50 萬像素，取絕對極值等於取殘餘顆粒分布的 4.5σ 尾巴 ——
 * 量到的是模糊核有多大，不是場有多勻。實測同一張圖，模糊半徑 8／16／24
 * 得到極差 8.42／7.07／6.66（純屬核心artefact），而 p99−p1 是 6.59／6.04／5.81。
 * 判定門檻必須架在後者上。
 */
function percentileStats(src, w, h, x0, y0, x1, y1) {
  const vals = [];
  for (let y = y0 | 0; y < y1; y++)
    for (let x = x0 | 0; x < x1; x++) vals.push(src[y * w + x]);
  vals.sort((a, b) => a - b);
  const q = p => vals[Math.min(vals.length - 1, Math.floor(vals.length * p))];
  return { p1: q(0.01), p99: q(0.99), range: q(0.99) - q(0.01) };
}

function regionStats(lum, w, h, x0, y0, x1, y1) {
  let s = 0, n = 0, mx = -Infinity, mn = Infinity;
  for (let y = y0 | 0; y < y1; y++) {
    for (let x = x0 | 0; x < x1; x++) {
      const v = lum[y * w + x];
      s += v; n++; if (v > mx) mx = v; if (v < mn) mn = v;
    }
  }
  return { mean: s / n, max: mx, min: mn, range: mx - mn };
}

/** 單張截圖的量測。回傳原始數值，判定交給 evaluate()。 */
export function measure(buf, opts = {}) {
  const img = decodePNG(buf);
  const { width: w, height: h, channels, data } = img;
  const lum = toLuma(img);
  const n = w * h;

  // 明度分布
  let max = 0, c48 = 0, c80 = 0, c32 = 0, sum = 0;
  for (let i = 0; i < n; i++) {
    const v = lum[i]; sum += v;
    if (v > max) max = v;
    if (v >= 48) c48++;
    if (v >= 80) c80++;
    if (v < 32) c32++;
  }

  // 中央 20% vs 邊緣 10%（左右兩側環）
  const centre = regionStats(lum, w, h, w * .4, h * .4, w * .6, h * .6);
  const edgeL = regionStats(lum, w, h, 0, 0, w * .1, h);
  const edgeR = regionStats(lum, w, h, w * .9, 0, w, h);
  const edgeMean = (edgeL.mean + edgeR.mean) / 2;

  // 顆粒：高通殘差（半徑 2 的箱形模糊之外的能量）
  const blurred = boxBlur(lum, w, h, 2);
  const hp = new Float64Array(n);
  for (let i = 0; i < n; i++) hp[i] = lum[i] - blurred[i];
  const grainSD = sd(hp);

  // 三通道殘差振幅（顆粒必須無彩）
  const chSD = [];
  if (channels >= 3) {
    for (let c = 0; c < 3; c++) {
      const ch = new Float64Array(n);
      for (let i = 0; i < n; i++) ch[i] = data[i * channels + c];
      const cb = boxBlur(ch, w, h, 2);
      const cr = new Float64Array(n);
      for (let i = 0; i < n; i++) cr[i] = ch[i] - cb[i];
      chSD.push(sd(cr));
    }
  }
  const chSpread = chSD.length === 3
    ? (Math.max(...chSD) - Math.min(...chSD)) / (Math.max(...chSD) || 1) : 0;

  // 低頻殘差：乾淨區域（避開漏光與內容）取左上與右上各 512²，取較小者
  const cs = Math.min(512, w >> 1, h >> 1);
  const clean = cropLuma(lum, w, h, Math.round(w * .04), Math.round(h * .04), cs);
  const r64 = sd(octaveResidual(clean, cs, cs, 64));
  const r128 = sd(octaveResidual(clean, cs, cs, 128));
  const r32 = sd(octaveResidual(clean, cs, cs, 32));

  // 色相分布：只看有彩度的像素。
  //
  // 門檻必須用「絕對彩度」而非相對飽和度：底色 luma 只有 13 上下，
  // r=20 g=13 b=11 這種像素的 d/mx 高達 0.45，看似高飽和，實際 chroma 只有 9/255，
  // 而 8 bit 量化的 ±1 就能讓色相跳好幾度。用相對門檻會把整片捨入雜訊當成違規
  // （實測violating像素中位 chroma 4/255，且堆在 0°/15°/60° —— 全是捨入的指紋）。
  // chroma ≥ 12/255 時 ±1 捨入造成的色相位移約 ≤5°，遠小於 12° 的容許帶寬。
  const CHROMA_MIN = 12;
  let hueOK = 0, hueBad = 0, hueSkip = 0;
  if (channels >= 3) {
    for (let i = 0; i < n; i++) {
      const p = i * channels;
      const r = data[p] / 255, g = data[p + 1] / 255, b = data[p + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      if (d * 255 < CHROMA_MIN) { hueSkip++; continue; }
      let hue;
      if (mx === r) hue = 60 * (((g - b) / d) % 6);
      else if (mx === g) hue = 60 * ((b - r) / d + 2);
      else hue = 60 * ((r - g) / d + 4);
      if (hue < 0) hue += 360;
      if ((hue >= 18 && hue <= 30) || (hue >= 180 && hue <= 192)) hueOK++; else hueBad++;
    }
  }

  // 正文欄：預設取畫面中央 measure 寬的帶狀區。
  //
  // 量的是「文字底下的低頻場是否勻」，所以必須在去掉顆粒後量。顆粒本身
  // 單像素振幅可達 ±25（opacity .10 × 255），直接取 raw 的 max/極差
  // 只會量到顆粒的最亮那一粒，跟均勻度無關。半徑 16 讓顆粒 SD 降到約 0.2。
  const colW = Math.min(opts.measure ?? 646, w);
  const cx0 = opts.column ? opts.column[0] : (w - colW) / 2;
  const cx1 = opts.column ? opts.column[1] : (w + colW) / 2;
  const column = percentileStats(boxBlur(lum, w, h, 16), w, h, cx0, h * .15, cx1, h * .85);
  // 欄寬佔滿視窗時（手機、或非置中版式），「欄內是否比周圍勻」這個問題本身
  // 就退化了 —— 欄就是整個畫面。極差條款此時不適用，最大值條款仍然成立。
  const columnIsNarrow = (cx1 - cx0) <= w * 0.7;

  return {
    width: w, height: h, channels,
    mean: sum / n, max,
    pct48: c48 / n * 100, pct80: c80 / n * 100, pct32: c32 / n * 100,
    centre: centre.mean, edge: edgeMean, edgeL: edgeL.mean, edgeR: edgeR.mean,
    grainSD, chSD, chSpread: chSpread * 100,
    res32: r32, res64: r64, res128: r128,
    hueOK, hueBad, hueBadPct: hueOK + hueBad ? hueBad / (hueOK + hueBad) * 100 : 0,
    columnMax: column.p99, columnRange: column.range, columnIsNarrow,
    columnExplicit: !!opts.column,
    columnFrom: Math.round(cx0), columnTo: Math.round(cx1)
  };
}

function cropLuma(lum, w, h, x0, y0, size) {
  const out = new Float64Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      out[y * size + x] = lum[Math.min(h - 1, y0 + y) * w + Math.min(w - 1, x0 + x)];
  return out;
}

/** 把量測值判成八條驗收。shots 為多張時才會有第 2 條。 */
export function evaluate(shots, opts = {}) {
  const bgOnly = !opts.content;
  const m = shots[0];
  const rows = [];
  const add = (id, name, pass, detail, skip) =>
    rows.push({ id, name, pass, detail, skip: !!skip });

  add(1, '中央 20% 暗於邊緣 10%', m.centre < m.edge,
      `中央 ${m.centre.toFixed(1)} → 邊緣 ${m.edge.toFixed(1)}`);

  if (shots.length > 1) {
    const es = shots.map(s => s.edge);
    const spread = (Math.max(...es) - Math.min(...es)) / (es.reduce((a, b) => a + b) / es.length) * 100;
    add(2, '跨截圖邊緣穩定度 ≤ ±10%', spread <= 10,
        `${es.map(v => v.toFixed(1)).join(' / ')} → 極差 ${spread.toFixed(1)}%`);
  } else {
    add(2, '跨截圖邊緣穩定度 ≤ ±10%', true, '只有一張截圖，需兩張以上才能驗', true);
  }

  // 三條面積帶是規格的實質控制，最大值只報不判。
  //
  // 規格的標題是「天花板 luma 65」，但緊接著就寫「luma ≥ 80 的面積 < 0.15%」——
  // 若 65 是硬上限，後面那句永遠不可能觸發，等於死碼。規格寫了它，就表示
  // ≥80 的像素是預期存在的，用面積約束而不是禁止。實測：邊緣微型字疊在 A 級
  // 最亮的漏光區加顆粒峰值上會到 71，只有 53 個像素（0.005%），三條面積帶全過。
  add(3, '明度面積（≥48 <4% · ≥80 <0.15% · <32 ≥84%）', bgOnly &&
        m.pct48 < 4 && m.pct80 < 0.15 && m.pct32 >= 84,
      `≥48 ${m.pct48.toFixed(2)}% · ≥80 ${m.pct80.toFixed(3)}% · <32 ${m.pct32.toFixed(1)}%` +
      `（最大值 ${m.max.toFixed(1)}，僅供參考）`, !bgOnly);

  add(4, '顆粒 mean 約 12.8 且 SD 6–14', m.grainSD >= 6 && m.grainSD <= 14,
      `SD ${m.grainSD.toFixed(2)}${bgOnly ? ` · 全圖 mean ${m.mean.toFixed(2)}` : ''}`);

  // 沒有顆粒可判時，這條無定義：三個通道的殘差都是 8 bit 捨入的餘數（約 0.0x），
  // 相對差異算出來動輒 70% 卻毫無意義。振幅太小就交回第 4 條去報，不在這裡誤判。
  const grainMeasurable = m.chSD.length === 3 && Math.max(...m.chSD) >= 2;
  add(5, '三通道殘差振幅差異 < 5%', grainMeasurable && m.chSpread < 5,
      m.chSD.length !== 3 ? '灰階圖，無三通道'
        : !grainMeasurable ? `殘差振幅僅 ${Math.max(...m.chSD).toFixed(2)}，無顆粒可判 —— 見第 4 條`
        : `${m.chSD.map(v => v.toFixed(2)).join(' / ')} → 差異 ${m.chSpread.toFixed(1)}%`,
      m.chSD.length === 3 && !grainMeasurable);

  // 只驗絕對門檻。不比 32px：乾淨區裡本來就有漏光的平緩坡度，
  // 128px 尺度量到的是那道刻意的坡，不是斑駁。
  add(6, '乾淨區 64/128px 殘差 < 0.7', m.res64 < 0.7 && m.res128 < 0.7,
      `64px ${m.res64.toFixed(2)} · 128px ${m.res128.toFixed(2)}（參考：32px ${m.res32.toFixed(2)}）`);

  // 這條的分母會塌，塌了就不能判。它問的是「有彩像素裡有幾成跑出色帶」，
  // 而有彩像素的數量隨頁型與寬度差兩個數量級：1280 的 C 級有 147,002 個，
  // 375 的 C 級只剩約 400 個 —— 手機斷點把 --leak-a 降到 6%，漏光的水平半徑
  // 又是 min(55vw, 900px)，375 下只有 206px。分母一塌，三十幾個顆粒尖端的
  // 離群像素就把比例推到 9%，但它們佔全圖僅 0.01%，與 1280 下的絕對量同級。
  // 實測 375：十份 C 級樣本全數報紅（7.10–12.66%），六份 A 級全數通過（0.01%）。
  // 量到的是分母，不是背景。
  //
  // 真有色偏時這條仍然會判：色偏意味著大片像素帶彩，分母自然回到門檻之上。
  // 被跳過的只有「幾乎沒有有彩像素」那種情況，而那本來就沒有色偏可言。
  // 照第 5 條的先例：振幅／基數不足就標為無定義，不在這裡誤判。
  const huePop = m.hueOK + m.hueBad;
  const hueMeasurable = huePop >= m.width * m.height * 0.02;
  add(7, '背景色相僅落在 18–30° 或 180–192°', bgOnly && hueMeasurable && m.hueBadPct < 1,
      !hueMeasurable
        ? `chroma ≥12 的像素僅 ${huePop} 個，不足全圖 2% —— 漏光在此尺寸過弱，比例無定義`
        : `chroma ≥12 的像素 ${huePop} 個 · 違規 ${m.hueBad}（${m.hueBadPct.toFixed(2)}%）`,
      !bgOnly || !hueMeasurable);

  // 這條是閱讀型的約束：正文要坐在均勻的暗場上。預設欄界「置中、寬 --measure」
  // 是 C 級的版式規則。
  //
  // A 級敘事頁的漏光是 C 級的 2.4 倍，內容也不收在 --measure 裡 —— 拿 C 級的
  // 欄界去量 A 級，量到的是別人的版面（實測同一套 BASE：A 級 p99 25.5、
  // C 級 18.0）。所以非 C 級時，除非呼叫端用 --column 給了真實欄界，這條不適用。
  const tier = String(opts.tier ?? 'c').toLowerCase();
  if (tier !== 'c' && !m.columnExplicit) {
    add(8, '正文欄低頻明度', true,
        `${tier.toUpperCase()} 級且未指定 --column，不適用 —— 預設欄界是 C 級版式。` +
        `參考值 p99 ${m.columnMax.toFixed(1)} · p99−p1 ${m.columnRange.toFixed(1)}`, true);
    return rows;
  }

  const rangeApplies = m.columnIsNarrow;
  add(8, `正文欄低頻 p99 ≤ 20${rangeApplies ? ' 且 p99−p1 ≤ 8' : '（欄佔滿寬，極差不適用）'}`,
      m.columnMax <= 20 && (!rangeApplies || m.columnRange <= 8),
      `x ${m.columnFrom}–${m.columnTo}${m.columnExplicit ? '（指定）' : '（預設：置中 --measure，即 C 級版式）'}` +
      ` · 去顆粒後 p99 ${m.columnMax.toFixed(1)} · p99−p1 ${m.columnRange.toFixed(1)}`);

  return rows;
}
