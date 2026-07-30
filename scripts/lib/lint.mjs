// 模板 lint：把逐次手動跑的靜態檢查固定下來。
//
// 每一條都對應規格裡一條會被違反的規則，而且都是在原始碼裡看得出來的。
// 看不出來的（顆粒強度、明度分布、色相）交給 `kage bg`。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const norm = s => s.replace(/\r\n/g, '\n');
const BEGIN = '/* ===== BASE BEGIN';
const END = '/* ===== BASE END ===== */';

/** 取 BASE 之外的內容 —— 大部分規則只適用於模板自己寫的部分。 */
function outsideBase(t) {
  const b = t.indexOf(BEGIN), e = t.indexOf(END);
  if (b < 0 || e < 0) return t;
  return t.slice(0, b) + t.slice(e + END.length);
}

const RULES = [
  {
    id: 'overlay-grain',
    desc: '近黑底禁止用 overlay 承載顆粒（強度會被壓縮約一個數量級）',
    scope: 'all',
    find: t => [...t.matchAll(/mix-blend-mode:\s*(overlay|soft-light|hard-light)/g)]
                 .map(m => m[0])
  },
  {
    id: 'traditional-vignette',
    desc: '禁止傳統攝影暗角（本設計語言是中央沉暗、邊緣漏光）',
    scope: 'all',
    find: t => [...t.matchAll(/--vignette|vignette\s*:/g)].map(m => m[0])
  },
  {
    id: 'stale-palette',
    desc: '舊色票殘留（#171814 色相 75° 為橄欖，明文禁用）',
    scope: 'all',
    find: t => [...t.matchAll(/#171814|#10110f/gi)].map(m => m[0])
  },
  {
    id: 'print-pipeline',
    desc: '本專案為純螢幕交付，不得出現列印管線的殘留',
    scope: 'all',
    find: t => [...t.matchAll(/weasyprint|pptx|mermaid|break-after:\s*page/gi)].map(m => m[0])
  },
  {
    id: 'colour-literal',
    desc: 'BASE 之外不得寫色彩字面值（黑色陰影除外），一律走 token',
    scope: 'outside',
    find: t => {
      const hits = [];
      for (const m of t.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) hits.push(m[0]);
      for (const m of t.matchAll(/rgb\(\s*([0-9]+)[\s,]+([0-9]+)[\s,]+([0-9]+)/g))
        if (!(m[1] === '0' && m[2] === '0' && m[3] === '0')) hits.push(m[0] + '…');
      return hits;
    }
  },
  {
    id: 'hardcoded-family',
    desc: '不得硬寫字族名，一律用 --serif / --sans / --mono（否則逃過 token 同步）',
    scope: 'outside',
    // 否定環視必須放在 \s* 之前：擺在後面時引擎會回溯讓 \s* 吃零個空白，
    // 環視就在空白處求值而恆真，整條規則變成永遠命中。
    find: t => [...t.matchAll(/font-family:(?!\s*var\()[^;]+;/g)].map(m => m[0].trim())
  },
  {
    id: 'glass-blur',
    desc: '禁止 backdrop-filter 毛玻璃 —— 螢幕原生語彙，且會糊掉底下的顆粒',
    scope: 'all',
    find: t => [...t.matchAll(/backdrop-filter:\s*[^;]+;/g)].map(m => m[0].trim())
  },
  {
    id: 'nested-placeholder',
    desc: '佔位符不得巢狀 —— 填製時內層被取代，外層的 }} 會變成孤兒留在成品裡',
    scope: 'all',
    find: t => [...t.matchAll(/\{\{[^}]*\{\{/g)].map(m => m[0])
  },
  {
    id: 'heavy-shadow',
    desc: '陰影上限 0 1px 0，禁止大型模糊陰影（不做懸浮卡片）',
    scope: 'outside',
    find: t => [...t.matchAll(/box-shadow:\s*[^;]*?(\d{2,})px[^;]*;/g)]
                 .filter(m => +m[1] >= 4 && !/inset/.test(m[0])).map(m => m[0].trim())
  }
];

const STRUCTURE = [
  { id: 'bg-fixed', desc: '須有 .bg-fixed 視窗錨定層', test: t => /class="bg-fixed"/.test(t) },
  { id: 'main', desc: '內容須包在 <main> 內（z-index 疊在背景之上）', test: t => /<main/.test(t) },
  { id: 'grain-src', desc: '顆粒須引用 grain-200.png', test: t => /grain-200\.png/.test(t) },
  { id: 'font-css', desc: '須引入自架字型 CSS', test: t => /noto-serif-tc\.css/.test(t) },
  { id: 'reduced-motion', desc: '須有 prefers-reduced-motion 降級', test: t => /prefers-reduced-motion/.test(t) },
  { id: 'forced-colors', desc: '須有 forced-colors 高對比支援', test: t => /forced-colors/.test(t) },
  { id: 'print', desc: '須有 @media print 降級', test: t => /@media print/.test(t) }
];

/** 純裝飾元素必須帶 aria-hidden；decor-num 承載真實內容，不在此列。 */
function checkAria(t) {
  const body = t.slice(t.indexOf('<body'));
  const bad = [];
  for (const m of body.matchAll(/<[a-z]+[^>]*class="[^"]*\b(decor-(?:rule|dash|corner|dust|scratch)|quote-bar|plate-mask)\b[^"]*"[^>]*>/g))
    if (!/aria-hidden/.test(m[0])) bad.push(m[0].slice(0, 70));
  return bad;
}

export function lintTemplates(dir = 'assets/templates', tokensPath = 'references/tokens.json') {
  const tokens = Object.keys(JSON.parse(readFileSync(tokensPath, 'utf8')));
  const files = readdirSync(dir).filter(f => f.endsWith('.html')).sort();
  const report = [];

  for (const f of files) {
    const full = norm(readFileSync(join(dir, f), 'utf8'));
    const out = outsideBase(full);
    const issues = [];

    for (const r of RULES) {
      const hits = r.find(r.scope === 'all' ? full : out);
      if (hits.length) issues.push({ rule: r.id, desc: r.desc, hits: [...new Set(hits)].slice(0, 4) });
    }
    for (const s of STRUCTURE)
      if (!s.test(full)) issues.push({ rule: s.id, desc: s.desc, hits: ['缺少'] });

    const unknown = [...new Set(full.match(/var\(--color-[a-z0-9-]+\)/g) || [])]
      .map(s => s.slice(4, -1)).filter(u => !tokens.includes(u));
    if (unknown.length) issues.push({ rule: 'unknown-token', desc: 'token 不存在於 tokens.json', hits: unknown });

    const aria = checkAria(full);
    if (aria.length) issues.push({ rule: 'aria-hidden', desc: '純裝飾元素須帶 aria-hidden', hits: aria });

    report.push({ file: f, issues });
  }
  return report;
}

/**
 * 交付前檢查：完成的文件不該殘留 {{佔位符}}。模板本身當然會有。
 *
 * 同時列出 [需要資料：…] 缺口。這兩者性質不同：殘留佔位符是**錯誤**
 * （沒填完就交件）；資料缺口是**刻意標記**，合法存在，但交付訊息裡
 * 必須逐條回報。少了這個列表，「有未回報的缺口就不算完成」這條規則
 * 就沒有工具支撐，只能靠人記得。
 */
export function checkPlaceholders(paths) {
  return paths.map(p => {
    const t = readFileSync(p, 'utf8');
    const hits = [...new Set(t.match(/\{\{[^}]{1,60}\}\}/g) || [])];
    const gaps = [...new Set(t.match(/\[需要資料[：:][^\]]{1,80}\]/g) || [])];
    return { file: p, count: hits.length, sample: hits.slice(0, 5), gaps };
  });
}
