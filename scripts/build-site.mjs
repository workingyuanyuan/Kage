// 產生官網四份：繁中／英文 × 標準／顯影。
//
// 官網不由 landing-page 模板填製 —— 它是設計系統展示頁，十章走過材質、
// 色彩、排印與母題，結構與那個模板不同。但它**共用同一段 BASE**，
// 由 `kage sync` 一併校驗，否則官網會脫離那個逐字一致的保證。
//
// 色彩章與字體章的內容從 references/tokens.json 與 BASE 的排印階梯生成，
// 不手抄 —— 手抄的數字會在下一次改 token 時默默過期。
//
//   node scripts/build-site.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { extractBase } from './lib/sync.mjs';

const REPO = 'https://github.com/workingyuanyuan/Kage';
const TOKENS = JSON.parse(readFileSync('references/tokens.json', 'utf8'));
const BASE = extractBase(readFileSync('assets/templates/one-pager.html', 'utf8').replace(/\r\n/g, '\n'))
  .replace(/\.\.\/img\//g, 'assets/img/');

const COPY = JSON.parse(readFileSync('site/_copy.json', 'utf8'));

// ── 從 token 檔生成色票 ────────────────────────────────────────────
// 只列真正構成這套語言的那幾組。45 個全列會變成一張沒有主張的清單。
const SWATCH_GROUPS = [
  ['基底與漏光', 'Base & Leak', [
    ['--color-background-base', '繪製基色。合成後約 luma 12.8'],
    ['--color-leak-1', '漏光最外緣'],
    ['--color-leak-2', '中段'],
    ['--color-leak-3', '主體'],
    ['--color-leak-4', '邊緣峰值'],
    ['--color-leak-core', '最亮點，面積 < 0.5%'],
  ]],
  ['文字', 'Text', [
    ['--color-text-on-dark', '正文'],
    ['--color-text-muted-on-dark', '次要與中繼資料'],
    ['--color-text-accent', '強調。24px 以下禁用'],
  ]],
  ['表面與材質', 'Surface & Material', [
    ['--color-surface-dark', '深色卡片表面'],
    ['--color-paper-surface', '淺色紙張，累計面積 ≤ 25%'],
    ['--color-paper-letter', '書信專用紙色'],
    ['--color-dust', '塵點'],
    ['--color-scratch', '刮痕'],
  ]],
];

const luma = hex => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255));
};

function swatches() {
  return SWATCH_GROUPS.map(([zh, en, items]) => `
  <div class="sw-group">
    <p class="t-label t-muted">${zh}<span class="sw-en">${en}</span></p>
    <div class="sw-row">
${items.map(([tok, note]) => {
  const v = TOKENS[tok];
  const l = luma(v);
  return `      <figure class="sw">
        <div class="sw-chip" style="background:${v}"></div>
        <figcaption>
          <code class="sw-hex">${v}</code>
          <span class="sw-note">${note}</span>
          ${l !== null ? `<span class="sw-luma decor-num">luma ${l.toFixed(1)}</span>` : ''}
        </figcaption>
      </figure>`;
}).join('\n')}
    </div>
  </div>`).join('\n');
}

// ── 排印階梯，取自 BASE 的實際數值 ─────────────────────────────────
const TYPE_ROWS = [
  ['t-display', 'display', '大標'], ['t-h1', 'h1', '章標'],
  ['t-h2', 'h2', '節標'], ['t-h3', 'h3', '小節'],
  ['t-lead', 'body-lead', '導言'], [null, 'body', '正文'],
  ['t-small', 'small', '附註'], ['t-caption', 'caption', '圖說'],
  ['t-label', 'label', '標籤'],
];
function typeScale(sample) {
  const sizes = Object.fromEntries([...BASE.matchAll(/\.(t-[a-z0-9]+)\s*\{[^}]*?font-size:\s*(\d+)px/g)]
    .map(m => [m[1], m[2]]));
  sizes['body'] = (BASE.match(/body \{[\s\S]*?font-size:\s*(\d+)px/) || [])[1] ?? '16';
  return TYPE_ROWS.map(([cls, name, zh]) => {
    const px = cls ? sizes[cls] : sizes['body'];
    return `      <div class="ty-row">
        <span class="ty-meta decor-num">${name} · ${px}px</span>
        <p class="${cls ?? ''} ty-sample">${sample}</p>
        <span class="ty-note t-caption t-muted">${zh}</span>
      </div>`;
  }).join('\n');
}

// ── 母題實地展示 ──────────────────────────────────────────────────
const MOTIFS = `
      <figure class="mo">
        <div class="mo-stage"><div class="mo-arc" aria-hidden="true"></div></div>
        <figcaption><span class="decor-num">01</span>幾何細線與弧線<span class="mo-note">1px 大半徑圓弧，不裁切、直接穿出畫面外</span></figcaption>
      </figure>
      <figure class="mo">
        <div class="mo-stage"><div class="mo-grit" aria-hidden="true"></div></div>
        <figcaption><span class="decor-num">02</span>塵點<span class="mo-note">位置寫死不隨機，合計面積 < 0.1%</span></figcaption>
      </figure>
      <figure class="mo">
        <div class="mo-stage"><span class="ghost t-label t-muted" data-ghost="SPECIMEN">SPECIMEN</span></div>
        <figcaption><span class="decor-num">03</span>鏡像重影<span class="mo-note">既有英文小標下方的垂直翻轉副本，不新增內容</span></figcaption>
      </figure>
      <figure class="mo">
        <div class="mo-stage"><span class="mo-edge decor-num">KAGE · v0.1 · 2026</span></div>
        <figcaption><span class="decor-num">04</span>邊緣編目微型字<span class="mo-note">屬材質而非資訊，內容取自頁面既有中繼資料</span></figcaption>
      </figure>`;

const CSS = `
/* ── 官網專屬版面。BASE 之外，不影響模板。 ── */
.site-wrap { max-width: 1120px; margin: 0 auto; padding: 0 var(--space-6); }
.nav { position: sticky; top: 0; z-index: 3; display: flex; align-items: baseline;
       gap: var(--space-6); padding: var(--space-5) 0;
       border-bottom: 1px solid var(--color-border-on-dark); }
.nav-mark { font-family: var(--serif); font-size: 19px; font-weight: 600; letter-spacing: .12em; }
.nav-links { margin-left: auto; display: flex; gap: var(--space-5); }
.nav-link { font-family: var(--sans); font-size: 11px; letter-spacing: .28em;
            text-transform: uppercase; text-decoration: none;
            color: var(--color-text-muted-on-dark); padding-bottom: 3px;
            border-bottom: 1px solid transparent; transition: color 150ms cubic-bezier(.2,0,0,1); }
.nav-link:hover { color: var(--color-text-on-dark); border-bottom-color: var(--color-border-accent); }
.nav-link[aria-current="true"] { color: var(--color-text-accent); border-bottom-color: var(--color-border-accent); }

.hero { padding: var(--space-16) 0 var(--space-12); }
.hero-aphorism { font-family: var(--serif); font-size: clamp(38px, 5.4vw, 62px); font-weight: 600;
                 line-height: 1.18; letter-spacing: .04em; max-width: 22em; }
.hero-lede { margin-top: var(--space-6); max-width: var(--measure); font-size: 18px; line-height: 1.80;
             color: var(--color-text-muted-on-dark); }
/* 規格帶直接接在導言下方，不加分隔線 —— 多一條線會把首屏切成兩塊空區。
   它是導言的延伸（同一件事的具體數值），不是另一個區段。 */
.spec-strip { margin-top: var(--space-6); display: flex; flex-wrap: wrap;
              gap: var(--space-5) var(--space-6); }
.spec-strip div { font-family: var(--sans); font-size: 11px; letter-spacing: .2em; }
.spec-strip b { display: block; font-family: var(--mono); font-weight: 400; font-size: 12px;
                letter-spacing: .1em; color: var(--color-text-on-dark); margin-top: 4px; }
.spec-strip span { color: var(--color-text-muted-on-dark); text-transform: uppercase; }

.sec { padding: var(--space-12) 0; border-top: 1px solid var(--color-border-on-dark); }
.sec-num { font-family: var(--mono); font-size: 11px; letter-spacing: .22em;
           color: var(--color-text-accent); }
.sec-title { margin-top: var(--space-3); font-size: 30px; font-weight: 600; letter-spacing: .03em; }
.sec-lede { margin-top: var(--space-4); max-width: var(--measure); color: var(--color-text-muted-on-dark); }
.sec-body { margin-top: var(--space-8); }

.g2 { display: grid; grid-template-columns: 1.618fr 1fr; gap: var(--space-8); }
.g3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-6); }
@media (max-width: 900px) { .g2, .g3 { grid-template-columns: 1fr; } }

/* 展示：示範文件縮圖 */
.shot { margin: 0; }
.shot a { display: block; text-decoration: none; }
.shot img { display: block; width: 100%; height: auto;
            border: 1px solid var(--color-border-on-dark); }
.shot figcaption { margin-top: var(--space-3); font-size: 13px; letter-spacing: .02em; }
.shot .kind { display: block; font-family: var(--sans); font-size: 10px; letter-spacing: .28em;
              text-transform: uppercase; color: var(--color-text-muted-on-dark); margin-bottom: 4px; }

/* 色票 */
.sw-group { margin-bottom: var(--space-8); }
.sw-en { margin-left: var(--space-3); color: var(--color-text-muted-on-dark); }
.sw-row { margin-top: var(--space-4); display: grid;
          grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: var(--space-4); }
.sw { margin: 0; }
.sw-chip { height: 72px; border: 1px solid var(--color-border-on-dark); }
.sw figcaption { margin-top: var(--space-2); display: flex; flex-direction: column; gap: 2px; }
.sw-hex { font-family: var(--mono); font-size: 11px; letter-spacing: .06em; }
.sw-note { font-size: 12px; color: var(--color-text-muted-on-dark); line-height: 1.5; }
.sw-luma { font-size: 10px; }

/* 排印階梯 */
.ty-row { display: grid; grid-template-columns: 132px 1fr 92px; gap: var(--space-5);
          align-items: baseline; padding: var(--space-4) 0;
          border-bottom: 1px solid rgb(238 228 213 / 10%); }
.ty-sample { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 900px) { .ty-row { grid-template-columns: 1fr; } }

/* 母題展示台 */
.mo { margin: 0; }
.mo-stage { position: relative; height: 168px; overflow: hidden;
            border: 1px solid var(--color-border-on-dark);
            background-color: var(--color-background-base); }
.mo-stage::after { content: ""; position: absolute; inset: 0; opacity: .10;
                   background-image: url("assets/img/grain-200.png"); background-size: 200px 200px; }
.mo-arc { position: absolute; width: 420px; height: 420px; left: -90px; top: 64px;
          border: 1px solid var(--color-hairline); border-radius: 50%; }
.mo-grit { position: absolute; left: 22%; top: 28%; width: 2px; height: 2px; border-radius: 50%;
           background: var(--color-dust);
           box-shadow: 44px 22px var(--color-dust), 96px 61px var(--color-dust),
                       152px 18px var(--color-dust), 187px 88px var(--color-dust),
                       61px 104px var(--color-dust), 132px 126px var(--color-dust); }
.mo-stage .ghost { position: absolute; left: var(--space-5); top: 58px; }
.mo-edge { position: absolute; right: -22px; top: 50%; transform: translateY(-50%) rotate(90deg);
           font-size: 9px; letter-spacing: .5em; opacity: .3; }
.mo figcaption { margin-top: var(--space-3); font-size: 13px; }
.mo-note { display: block; margin-top: 4px; color: var(--color-text-muted-on-dark);
           font-size: 12px; line-height: 1.55; }

/* 元件展示 */
.cp { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: center; }
.cp-panel { padding: var(--space-5); }
.cp-panel dt { font-family: var(--sans); font-size: 10px; letter-spacing: .28em;
               text-transform: uppercase; color: var(--color-text-muted-on-dark); }
.cp-panel dd { margin: 4px 0 var(--space-4); }

/* 驗收清單 */
.chk { list-style: none; }
.chk li { display: grid; grid-template-columns: 26px 1fr; gap: var(--space-3);
          padding: var(--space-3) 0; border-bottom: 1px solid rgb(238 228 213 / 10%); }
.chk .n { font-family: var(--mono); font-size: 11px; color: var(--color-text-accent); }
.chk b { font-weight: 600; }
.chk span { display: block; margin-top: 3px; font-size: 13px;
            color: var(--color-text-muted-on-dark); line-height: 1.6; }

/* 問答 */
.qa { max-width: var(--measure); }
.qa dt { margin-top: var(--space-6); font-weight: 600; font-size: 18px; }
.qa dd { margin-top: var(--space-3); color: var(--color-text-muted-on-dark); }

.foot { padding: var(--space-10) 0 var(--space-12); border-top: 1px solid var(--color-border-on-dark);
        display: flex; flex-wrap: wrap; gap: var(--space-5); justify-content: space-between; }
.foot a { color: var(--color-text-muted-on-dark); text-decoration: none; }
.foot a:hover { color: var(--color-text-accent); }
`;

// ── 展示區的示範文件 ──────────────────────────────────────────────
const DEMOS = [
  ['one-pager', 'demo-archive-proposal', '單頁方案'],
  ['long-doc', 'demo-index-engine', '長篇報告'],
  ['equity-report', 'demo-packaging-equity', '個股研報'],
  ['portfolio', 'demo-document-portfolio', '作品集'],
  ['letter', 'demo-review-notice', '正式書信'],
  ['changelog', 'demo-aperture-changelog', '更新日誌'],
  ['slides', 'demo-legibility-talk', '簡報'],
  ['landing-page', 'demo-aperture-site', '產品頁'],
];

function build({ out, lang, mode, c, other }) {
  const en = lang === 'en';
  const suffix = en ? '-en' : '';
  const demoSuffix = en ? '-en' : '';
  const sec = (n, key, bodyHtml) => `
  <section class="sec" id="s${n}">
    <p class="sec-num">${n} · ${c[`sec.${key}.num`]}</p>
    <h2 class="sec-title">${c[`sec.${key}.title`]}</h2>
    <p class="sec-lede">${c[`sec.${key}.lede`]}</p>
    <div class="sec-body">${bodyHtml}</div>
  </section>`;

  const html = `<!DOCTYPE html>
<!-- 影 · kage 官網。由 scripts/build-site.mjs 生成，不要手改。
     BASE 區塊與模板逐字共用，由 kage sync 校驗。 -->
<html lang="${en ? 'en' : 'zh-Hant'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${c['meta.title']}</title>
<meta name="description" content="${c['meta.desc']}">
<meta name="author" content="workingyuanyuan">
<meta name="generator" content="kage">
<link rel="canonical" href="https://example.com/kage/${out}">
<meta property="og:type" content="website">
<meta property="og:title" content="${c['meta.title']}">
<meta property="og:description" content="${c['meta.desc']}">
<meta property="og:image" content="assets/demos/${DEMOS[0][1]}${demoSuffix}-1280.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="assets/fonts/noto-serif-tc/noto-serif-tc.css">
<style>
${BASE}
${CSS}
</style>
</head>
<body>

<div class="bg-fixed" aria-hidden="true"></div>
<div class="decor-arc decor-arc--a" aria-hidden="true"></div>
<div class="decor-arc decor-arc--b" aria-hidden="true"></div>
<div class="decor-grit" aria-hidden="true"></div>
<span class="edge-code" aria-hidden="true">KAGE · v0.1 · 2026</span>

<main class="site-wrap">

  <nav class="nav">
    <span class="nav-mark">${en ? 'kage' : '影 · kage'}</span>
    <div class="nav-links">
      <a class="nav-link" href="${other.develop}"${mode === 'develop' ? ' aria-current="true"' : ''}>${c['nav.develop']}</a>
      <a class="nav-link" href="${other.lang}">${en ? '繁中' : 'EN'}</a>
    </div>
  </nav>

  <header class="hero">
    <div class="decor-dash" aria-hidden="true"></div>
    <h1 class="hero-aphorism" style="margin-top:var(--space-5)">${c['hero.aphorism']}</h1>
    <p class="hero-lede">${c['hero.lede']}</p>
    <div class="spec-strip">
      <div><span>${c['spec.base']}</span><b>#000000 → luma 12.8</b></div>
      <div><span>${c['spec.leak']}</span><b>18–30° · 24% / 19%</b></div>
      <div><span>${c['spec.serif']}</span><b>Noto Serif TC</b></div>
      <div><span>${c['spec.grain']}</span><b>SD 7.4</b></div>
      <div><span>${c['spec.license']}</span><b>MIT</b></div>
    </div>
  </header>

${sec('00', 'showcase', `<div class="g3">
${DEMOS.map(([type, slug, zh]) => `      <figure class="shot">
        <a href="assets/demos/${slug}${demoSuffix}.html">
          <img src="assets/demos/${slug}${demoSuffix}-1280.png" alt="${c[`demo.${type}.alt`]}">
        </a>
        <figcaption><span class="kind">${type}</span>${c[`demo.${type}.cap`]}</figcaption>
      </figure>`).join('\n')}
    </div>
    <p class="sec-lede" style="margin-top:var(--space-6)">${c['showcase.note']}</p>`)}

${sec('01', 'usage', `<div class="g2">
      <div class="measure"><p>${c['usage.body1']}</p><p style="margin-top:var(--space-4)">${c['usage.body2']}</p></div>
      <aside class="cp-panel surf surf--card"><dl>
        <dt>${c['usage.k1']}</dt><dd>${c['usage.v1']}</dd>
        <div class="decor-rule" aria-hidden="true"></div>
        <dt style="margin-top:var(--space-4)">${c['usage.k2']}</dt><dd>${c['usage.v2']}</dd>
      </dl></aside>
    </div>`)}

${sec('02', 'manifesto', `<div class="measure">
      <p class="t-lead">${c['manifesto.1']}</p>
      <p class="t-lead" style="margin-top:var(--space-5)">${c['manifesto.2']}</p>
      <p class="t-lead" style="margin-top:var(--space-5)">${c['manifesto.3']}</p>
    </div>`)}

${sec('03', 'color', swatches())}

${sec('04', 'type', `<div>
${typeScale(c['type.sample'])}
    </div>
    <p class="sec-lede" style="margin-top:var(--space-6)">${c['type.note']}</p>`)}

${sec('05', 'material', `<div class="g2">
      <div class="measure">
        <p>${c['material.body1']}</p>
        <p style="margin-top:var(--space-4)">${c['material.body2']}</p>
      </div>
      <aside class="cp-panel surf surf--card"><dl>
        <dt>${c['material.l1']}</dt><dd>${c['material.d1']}</dd>
        <dt>${c['material.l2']}</dt><dd>${c['material.d2']}</dd>
        <dt>${c['material.l3']}</dt><dd>${c['material.d3']}</dd>
        <dt>${c['material.l4']}</dt><dd>${c['material.d4']}</dd>
      </dl></aside>
    </div>`)}

${sec('06', 'motif', `<div class="g2" style="grid-template-columns:1fr 1fr">${MOTIFS}</div>`)}

${sec('07', 'components', `<div class="g2">
      <div>
        <div class="cp">
          <a class="btn btn-primary" href="${REPO}">${c['cp.btn1']}<span aria-hidden="true">→</span></a>
          <a class="btn btn-secondary" href="${REPO}/blob/main/SKILL.md">${c['cp.btn2']}</a>
        </div>
        <blockquote class="quote" style="margin-top:var(--space-6)">${c['cp.quote']}</blockquote>
      </div>
      <aside class="cp-panel surf surf--paper">
        <p class="t-small">${c['cp.paper']}</p>
      </aside>
    </div>`)}

${sec('08', 'acceptance', `<ol class="chk">
${[1,2,3,4,5,6,7,8].map(i => `      <li><span class="n">${String(i).padStart(2,'0')}</span>
        <div><b>${c[`chk.${i}.t`]}</b><span>${c[`chk.${i}.d`]}</span></div></li>`).join('\n')}
    </ol>`)}

${sec('09', 'faq', `<dl class="qa">
${[1,2,3,4].map(i => `      <dt>${c[`faq.${i}.q`]}</dt><dd>${c[`faq.${i}.a`]}</dd>`).join('\n')}
    </dl>`)}

  <footer class="foot t-meta">
    <span>${en ? 'kage' : '影 · kage'} · 2026 · MIT</span>
    <span>
      <a href="${REPO}">${c['foot.src']}</a> ·
      <a href="${REPO}/blob/main/SKILL.md">${c['foot.doc']}</a> ·
      <a href="${REPO}/issues">${c['foot.issues']}</a>
    </span>
  </footer>

</main>
</body>
</html>
`;

  const left = [...new Set(html.match(/undefined/g) || [])];
  if (left.length) {
    const miss = [...html.matchAll(/>([^<]*undefined[^<]*)</g)].slice(0, 3).map(m => m[1].trim());
    throw new Error(`${out}：文案有缺鍵，範例 ${JSON.stringify(miss)}`);
  }
  for (const bad of ['Kami', 'Reverse 1999', 'R1999'])
    if (html.includes(bad)) throw new Error(`${out}：出現禁用字樣 ${bad}`);

  writeFileSync(out, html);
  console.log(`  ${out}  ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
}

const PAGES = [
  ['index.html',            'zh-Hant', 'standard', 'zh.standard', { develop: 'index-develop.html',    lang: 'index-en.html' }],
  ['index-develop.html',    'zh-Hant', 'develop',  'zh.develop',  { develop: 'index.html',            lang: 'index-en-develop.html' }],
  ['index-en.html',         'en',      'standard', 'en.standard', { develop: 'index-en-develop.html', lang: 'index.html' }],
  ['index-en-develop.html', 'en',      'develop',  'en.develop',  { develop: 'index-en.html',         lang: 'index-develop.html' }],
];

console.log('產生官網');
for (const [out, lang, mode, key, other] of PAGES) {
  const c = { ...COPY.shared, ...COPY[key] };
  build({ out, lang, mode, c, other });
}
