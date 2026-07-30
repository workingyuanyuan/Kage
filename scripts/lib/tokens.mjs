// token 漂移檢查：tokens.json 是唯一真相，模板的 :root 必須與它一致。
//
// 單檔自包含意味著 45 個 token 在每份模板裡各存一份。沒有這支檢查，
// 任何一份改錯一個色碼都不會有人發現。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const norm = s => s.replace(/\r\n/g, '\n');

/** 從 CSS 文字抽出 :root 內的自訂屬性。 */
export function parseRoot(css) {
  const out = {};
  const m = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!m) return out;
  for (const d of m[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    out[d[1]] = d[2].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
  }
  return out;
}

export function checkTokens(dir = 'assets/templates', tokensPath = 'references/tokens.json') {
  const want = JSON.parse(readFileSync(tokensPath, 'utf8'));
  const wantKeys = Object.keys(want);
  const files = readdirSync(dir).filter(f => f.endsWith('.html')).sort();
  const findings = [];

  for (const f of files) {
    const css = norm(readFileSync(join(dir, f), 'utf8'));
    const got = parseRoot(css);
    const colour = Object.fromEntries(
      Object.entries(got).filter(([k]) => k.startsWith('--color-')));

    for (const k of wantKeys) {
      if (!(k in colour)) { findings.push({ file: f, token: k, issue: '缺少' }); continue; }
      const a = colour[k].toLowerCase(), b = want[k].toLowerCase();
      if (a !== b) findings.push({ file: f, token: k, issue: `值不符：${colour[k]} ≠ ${want[k]}` });
    }
    for (const k of Object.keys(colour))
      if (!wantKeys.includes(k)) findings.push({ file: f, token: k, issue: '多出（不在 tokens.json）' });
  }
  return { files: files.length, tokens: wantKeys.length, findings };
}
