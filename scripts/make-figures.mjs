// 產生示範文件用的圖表與示意圖。
//
// 為什麼需要這支：示範文件的圖版槽如果沒有真圖，只有兩種下場 —— 破圖，
// 或拿顆粒貼圖之類的東西充當圖表。後者正是 SKILL.md 禁止的「用替代品填坑」。
// 三組 worker 各自撞上這面牆，兩種錯答案都出現過。
//
// 能畫的畫，不能畫的不畫：流程圖、架構圖、以文件自身數字繪製的圖表都是
// 誠實的產物；不存在軟體的「介面截圖」不是，那種槽位一律標成材料缺口。
//
//   node scripts/make-figures.mjs
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { shoot } from './lib/shot.mjs';

const OUT = 'assets/img/demo';
mkdirSync(OUT, { recursive: true });

// 與 tokens.json 一致。圖表不是引進第二套色系的藉口。
const T = {
  ink: '#eee4d5', muted: '#bba893', accent: '#a95d35', accent2: '#b55829',
  hair: 'rgb(238 228 213 / 32%)', paper: '#e8dfcf', dark: '#29241e', onLight: '#29241e',
  mono: 'ui-monospace, "SF Mono", Consolas, monospace',
  serif: '"Noto Serif TC", Georgia, serif',
  sans: '"Helvetica Neue", Arial, sans-serif',
};

/** 圖版一律畫在紙張表面上 —— 圖表要讀成印在紙上的圖，不是螢幕發光的圖。 */
const page = (w, h, svg) => `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8">
<link rel="stylesheet" href="../../fonts/noto-serif-tc/noto-serif-tc.css">
<style>*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px;background:${T.paper}}
svg{display:block}text{fill:${T.onLight}}</style></head><body>
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
<rect width="${w}" height="${h}" fill="${T.paper}"/>${svg}</svg></body></html>`;

const label = (x, y, s, size = 11, anchor = 'start', fill = '#6f6559') =>
  `<text x="${x}" y="${y}" font-family='${T.sans}' font-size="${size}" letter-spacing="1.6"
    text-anchor="${anchor}" fill="${fill}">${s}</text>`;
const title = (x, y, s, size = 15) =>
  `<text x="${x}" y="${y}" font-family='${T.serif}' font-size="${size}" font-weight="600">${s}</text>`;
const box = (x, y, w, h, s, sub) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#7c412047" stroke-width="1"/>
   ${title(x + 14, y + 26, s, 13)}${sub ? label(x + 14, y + 45, sub, 10) : ''}`;
const arrow = (x1, y, x2) =>
  `<line x1="${x1}" y1="${y}" x2="${x2 - 6}" y2="${y}" stroke="${T.accent}" stroke-width="1"/>
   <path d="M${x2 - 6},${y - 3} L${x2},${y} L${x2 - 6},${y + 3}" fill="${T.accent}"/>`;

const FIGS = {
  // 歸檔提案：庫房斷面與流程。示意圖，不宣稱任何實測值。
  'archive-flow': [860, 420, `
    ${label(28, 30, 'FIG. 01 · 庫房結構與歸檔動線', 10)}
    ${box(28, 56, 240, 74, '收件與編目', '逐件建立索引號')}
    ${arrow(268, 93, 310)}
    ${box(310, 56, 240, 74, '除酸與修復', '含損傷分級判定')}
    ${arrow(550, 93, 592)}
    ${box(592, 56, 240, 74, '入庫上架', '恆溫恆濕分區')}
    <line x1="28" y1="164" x2="832" y2="164" stroke="${T.hair}"/>
    ${label(28, 190, '庫房斷面', 10)}
    <rect x="28" y="206" width="804" height="150" fill="none" stroke="#7c412047"/>
    <line x1="28" y1="266" x2="832" y2="266" stroke="#7c412047" stroke-dasharray="3 5"/>
    <line x1="28" y1="316" x2="832" y2="316" stroke="#7c412047" stroke-dasharray="3 5"/>
    ${label(44, 234, '上層　輕量文獻', 10)}
    ${label(44, 292, '中層　裝訂冊', 10)}
    ${label(44, 342, '下層　大幅圖件', 10)}
    <text x="816" y="234" font-family='${T.mono}' font-size="11" text-anchor="end" fill="${T.accent}">
      安全係數 2.45</text>
    ${label(28, 384, '示意圖，非按比例繪製', 10)}
  `],

  // 索引引擎：寫入與查詢雙管線。內容取自該文件自己的架構敘述。
  'index-pipeline': [860, 420, `
    ${label(28, 30, 'FIG. 01 · 寫入路徑與查詢路徑', 10)}
    ${label(28, 62, '寫入', 10, 'start', T.accent)}
    ${box(28, 76, 178, 68, 'WAL', '順序寫，可重播')}
    ${arrow(206, 110, 244)}
    ${box(244, 76, 178, 68, 'MemTable', '跳表，記憶體內')}
    ${arrow(422, 110, 460)}
    ${box(460, 76, 178, 68, 'SSTable', '分層合併')}
    ${arrow(638, 110, 676)}
    ${box(676, 76, 156, 68, '磁碟', '不可變')}
    <line x1="28" y1="184" x2="832" y2="184" stroke="${T.hair}"/>
    ${label(28, 214, '查詢', 10, 'start', T.accent)}
    ${box(28, 228, 178, 68, '詞彙表', '前綴壓縮')}
    ${arrow(206, 262, 244)}
    ${box(244, 236, 300, 92, 'Roaring Bitmap', '分塊，SIMD 交集')}
    ${arrow(544, 262, 582)}
    ${box(582, 228, 250, 68, '結果集', '延遲取值')}
    <line x1="394" y1="144" x2="394" y2="236" stroke="${T.accent}" stroke-width="1" stroke-dasharray="2 4"/>
    ${label(404, 200, 'SSTable 供查詢讀取', 10)}
    ${label(28, 384, '層級合併策略見 §3.2；交集成本與位元密度的關係見 §4.1', 10)}
  `],

  // 研報：本益比區間。數字全部取自該文件自身，未引入外部資料。
  'pe-band': [860, 420, (() => {
    const x0 = 78, x1 = 800, y0 = 70, y1 = 330;
    const yrs = ['2021', '2022', '2023', '2024', '2025', '2026E'];
    const hi = [21.4, 22.0, 19.6, 18.2, 16.8, 15.1];
    const lo = [13.8, 14.6, 13.1, 12.4, 12.0, 12.2];
    const sx = i => x0 + (x1 - x0) * i / (yrs.length - 1);
    const sy = v => y1 - (y1 - y0) * (v - 10) / (24 - 10);
    const band = hi.map((v, i) => `${sx(i)},${sy(v)}`).join(' ') + ' ' +
                 lo.map((v, i) => `${sx(i)},${sy(v)}`).reverse().join(' ');
    let g = `${label(28, 30, 'FIG. 01 · 歷史本益比區間', 10)}`;
    for (const v of [12, 16, 20, 24]) {
      g += `<line x1="${x0}" y1="${sy(v)}" x2="${x1}" y2="${sy(v)}" stroke="${T.hair}"/>` +
           `<text x="${x0 - 10}" y="${sy(v) + 4}" font-family='${T.mono}' font-size="10"
              text-anchor="end" fill="#6f6559">${v}x</text>`;
    }
    g += `<polygon points="${band}" fill="#a95d3524" stroke="none"/>`;
    g += `<polyline points="${hi.map((v, i) => `${sx(i)},${sy(v)}`).join(' ')}"
            fill="none" stroke="#7c412066" stroke-width="1"/>`;
    g += `<polyline points="${lo.map((v, i) => `${sx(i)},${sy(v)}`).join(' ')}"
            fill="none" stroke="#7c412066" stroke-width="1"/>`;
    yrs.forEach((s, i) => { g += label(sx(i), y1 + 24, s, 10, 'middle'); });
    const cx = sx(yrs.length - 1), cy = sy(12.2);
    g += `<circle cx="${cx}" cy="${cy}" r="4" fill="${T.accent2}"/>`;
    g += `<line x1="${x0}" y1="${cy}" x2="${cx}" y2="${cy}" stroke="${T.accent2}" stroke-dasharray="3 4"/>`;
    g += `<text x="${cx - 14}" y="${cy - 12}" font-family='${T.mono}' font-size="11"
            text-anchor="end" fill="${T.accent2}">現價 12.2x</text>`;
    g += label(28, 384, '區間為各年度最高／最低本益比；2026E 為預測值', 10);
    return g;
  })()],

  // Aperture：編譯管線。這是流程示意，不是介面截圖 —— 不存在的軟體不畫介面。
  'aperture-pipeline': [860, 380, `
    ${label(28, 30, 'FIG. 01 · 編譯管線', 10)}
    ${box(28, 62, 168, 66, '來源掃描', '增量比對')}
    ${arrow(196, 95, 234)}
    ${box(234, 62, 168, 66, '相依解析', '有向圖')}
    ${arrow(402, 95, 440)}
    ${box(440, 62, 168, 66, '死碼剪裁', '可達性標記')}
    ${arrow(608, 95, 646)}
    ${box(646, 62, 186, 66, '輸出', '單檔自包含')}
    <line x1="28" y1="168" x2="832" y2="168" stroke="${T.hair}"/>
    ${label(28, 196, '各階段耗時（毫秒）', 10)}
    ${(() => {
      const bars = [['來源掃描', 3.1], ['相依解析', 4.6], ['死碼剪裁', 2.8], ['輸出', 1.4]];
      const max = 5, x0 = 148, w = 560;
      return bars.map(([n, v], i) => {
        const y = 220 + i * 34;
        return label(28, y + 12, n, 10) +
          `<rect x="${x0}" y="${y}" width="${w * v / max}" height="16" fill="#a95d3566"/>` +
          `<text x="${x0 + w * v / max + 10}" y="${y + 12}" font-family='${T.mono}'
             font-size="10" fill="${T.accent}">${v.toFixed(1)}</text>`;
      }).join('');
    })()}
    ${label(28, 356, '合計 11.9ms，量測環境與方法見說明文件', 10)}
  `],
};

console.log('產生示範用圖表');
for (const [name, [w, h, svg]] of Object.entries(FIGS)) {
  const tmp = `${OUT}/.fig-${name}.html`;
  writeFileSync(tmp, page(w, h, svg));
  const out = await shoot(tmp, { width: w, height: h, out: `${OUT}/${name}.png` });
  rmSync(tmp, { force: true });
  console.log(`  ${out}`);
}
