// 把參考實作的 BASE 區塊植入／校驗所有模板。
//
// BASE 是單檔自包含的代價：沒有共用 CSS 檔，一致性只能靠「逐字複製 + 事後比對」。
// 手抄七份可行但沒有理由冒險，這支讓它變成機械操作。
//
// 目標模板中，BASE 的位置可以是既有的 BEGIN/END 區塊，或一個 /*__BASE__*/ 佔位符。
//
// 比對前一律正規化換行：git 在 Windows 簽出時轉 CRLF，而多數編輯器寫 LF，
// 直接比對位元組會產生「每行差一個位元組」的假警報。
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const BEGIN = '/* ===== BASE BEGIN';
const END = '/* ===== BASE END ===== */';
const PLACEHOLDER = '/*__BASE__*/';

const norm = s => s.replace(/\r\n/g, '\n');
const md5 = s => createHash('md5').update(s).digest('hex');

/** 取 BEGIN…END 之間（含標記）的原文。標記不唯一時會取到錯的範圍，故呼叫端須驗長度。 */
export function extractBase(text) {
  const b = text.indexOf(BEGIN), e = text.indexOf(END);
  if (b < 0 || e < 0 || e < b) return null;
  return text.slice(b, e + END.length);
}

/**
 * 官網也帶同一段 BASE，但它在倉庫根目錄（GitHub Pages 從根出）而非 assets/templates/，資產路徑被改寫過
 * （`../img/` → `assets/img/`）。比對前先還原那個改寫，否則會誤判成漂移。
 * 這些頁面由 build-site.mjs 生成，只校驗不寫入 —— 要改就改參考實作再重新生成。
 */
const SITE = { dir: '.', rewrite: [[/assets\/img\//g, '../img/']] };

function checkSite(base) {
  const out = [];
  let files = [];
  try { files = readdirSync(SITE.dir).filter(f => f.endsWith('.html')).sort(); }
  catch { return out; }                       // 官網還沒生成
  for (const f of files) {
    let text = norm(readFileSync(join(SITE.dir, f), 'utf8'));
    for (const [re, to] of SITE.rewrite) text = text.replace(re, to);
    const cur = extractBase(text);
    out.push({
      file: `${SITE.dir}/${f}`,
      status: !cur ? '找不到 BASE 區塊'
        : md5(cur) === md5(base) ? 'identical' : 'DRIFT（官網須重新生成）',
    });
  }
  return out;
}

export function syncBase({ dir = 'assets/templates', ref = 'one-pager.html', write = false } = {}) {
  const base = extractBase(norm(readFileSync(join(dir, ref), 'utf8')));
  if (!base || base.length < 5000)
    throw new Error(`參考 BASE 擷取失敗（${base ? base.length : 0} bytes）。` +
      '檢查標記是否唯一 —— 檔頭註解若提到 BASE END 會讓 indexOf 取到錯的位置。');

  const targets = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.html') && f !== ref).sort()) {
    const p = join(dir, f);
    const text = norm(readFileSync(p, 'utf8'));
    const cur = extractBase(text);
    const placeholder = text.includes(PLACEHOLDER);

    if (cur && md5(cur) === md5(base)) { targets.push({ file: f, status: 'identical' }); continue; }
    if (!cur && !placeholder) { targets.push({ file: f, status: `無 BASE 區塊也無 ${PLACEHOLDER}` }); continue; }
    if (!write) { targets.push({ file: f, status: placeholder ? '待植入（佔位符）' : 'DRIFT' }); continue; }

    writeFileSync(p, placeholder ? text.replace(PLACEHOLDER, base) : text.replace(cur, base));
    targets.push({ file: f, status: 'written' });
  }

  targets.push(...checkSite(base));
  return { ref, base, baseBytes: Buffer.byteLength(base), md5: md5(base), targets };
}
