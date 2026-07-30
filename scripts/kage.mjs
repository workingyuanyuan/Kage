#!/usr/bin/env node
// 影 · kage 工具鏈的單一入口。
//
//   node scripts/kage.mjs check                 全部靜態檢查（sync + tokens + lint）
//   node scripts/kage.mjs sync [--write]        BASE 區塊同步／校驗
//   node scripts/kage.mjs tokens                token 漂移
//   node scripts/kage.mjs lint                  模板 lint
//   node scripts/kage.mjs placeholders <file…>  殘留佔位符（交付前跑）
//   node scripts/kage.mjs schemas               內容契約自身的健全性
//   node scripts/kage.mjs content <type> <json> 用契約驗一份稿子
//   node scripts/kage.mjs shot <html…> [--widths 1280,375] [--height 1800]
//                       [--bg-only] [--frames]  headless Chrome 截圖
//                       --frames 把長文件切成等高的框，每框都有正確背景
//   node scripts/kage.mjs bg <png…> [--content] [--tier a|b|c] [--column x0,x1]
//                                               背景層八條像素驗收
//
// 靜態檢查看得出來的，都在 lint／tokens；看不出來的（顆粒強度、明度分布、
// 色相、跨截圖穩定度）只能靠 bg 的像素統計。
import { readFileSync } from 'node:fs';
import { checkTokens } from './lib/tokens.mjs';
import { lintTemplates, checkPlaceholders } from './lib/lint.mjs';
import { measure, evaluate } from './lib/bg.mjs';
import { syncBase } from './lib/sync.mjs';
import { checkSchemas, validate } from './lib/content.mjs';
import { shoot, findBrowser } from './lib/shot.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const has = f => rest.includes(f);
const val = (f, d) => { const i = rest.indexOf(f); return i < 0 ? d : rest[i + 1]; };
// 取「不是旗標、也不是某個帶值旗標的值」的參數。逐一列出帶值旗標，
// 否則 `--widths 1280,375` 的 1280,375 會被當成檔名。
const VALUED = new Set(['--column', '--widths', '--tier', '--out', '--height']);
const files = rest.filter((a, i) => !a.startsWith('--') && !VALUED.has(rest[i - 1]));

const OK = '  ✓', NO = '  ✗';
let failed = false;

function head(s) { console.log(`\n${s}\n${'─'.repeat(s.length)}`); }

// ── sync ──────────────────────────────────────────────────────────
function cmdSync(write) {
  head('BASE 區塊');
  const r = syncBase({ write });
  console.log(`  參考 ${r.ref}：${r.baseBytes} bytes · md5 ${r.md5.slice(0, 12)}`);
  for (const t of r.targets) {
    const mark = t.status === 'identical' ? OK : t.status === 'written' ? '  →' : NO;
    console.log(`${mark} ${t.file.padEnd(20)} ${t.status}`);
    if (t.status !== 'identical' && t.status !== 'written') failed = true;
  }
  return r;
}

// ── tokens ────────────────────────────────────────────────────────
function cmdTokens() {
  head('Token 漂移');
  const r = checkTokens();
  if (!r.findings.length) {
    console.log(`${OK} ${r.files} 份模板 × ${r.tokens} 個 token，全部一致`);
  } else {
    failed = true;
    for (const f of r.findings) console.log(`${NO} ${f.file} · ${f.token} · ${f.issue}`);
  }
}

// ── lint ──────────────────────────────────────────────────────────
function cmdLint() {
  head('模板 lint');
  const report = lintTemplates();
  let n = 0;
  for (const { file, issues } of report) {
    if (!issues.length) { console.log(`${OK} ${file}`); continue; }
    failed = true; n += issues.length;
    console.log(`${NO} ${file}`);
    for (const i of issues) {
      console.log(`      [${i.rule}] ${i.desc}`);
      for (const h of i.hits) console.log(`         ${h}`);
    }
  }
  if (n) console.log(`\n  共 ${n} 項`);
}

// ── placeholders ──────────────────────────────────────────────────
function cmdPlaceholders(paths) {
  head('殘留佔位符');
  if (!paths.length) { console.log('  用法：kage placeholders <完成的檔案…>'); return; }
  for (const r of checkPlaceholders(paths)) {
    if (r.count) {
      failed = true;
      console.log(`${NO} ${r.file} 殘留 ${r.count} 個：${r.sample.join(' ')}${r.count > 5 ? ' …' : ''}`);
    } else {
      console.log(`${OK} ${r.file}`);
    }
    // 缺口不算失敗 —— 但交付訊息裡必須逐條列出，所以這裡一定要印出來。
    if (r.gaps.length) {
      console.log(`      ${r.gaps.length} 個資料缺口待回報：`);
      for (const g of r.gaps) console.log(`         ${g}`);
    }
  }
}

// ── schemas / content ─────────────────────────────────────────────
function cmdSchemas() {
  head('內容契約');
  const r = checkSchemas();
  console.log(`  ${r.types.length} 種文件類型 · ${r.have.length} 份契約`);
  if (!r.findings.length) { console.log(`${OK} 類型集合一致，契約結構健全`); return; }
  failed = true;
  for (const f of r.findings) console.log(`${NO} ${f}`);
}

function cmdContent(type, jsonPath) {
  head('稿件驗證');
  if (!type || !jsonPath) { console.log('  用法：kage content <type> <稿件.json>'); return; }
  const schema = JSON.parse(readFileSync(`references/schemas/${type}.json`, 'utf8'));
  const errs = validate(JSON.parse(readFileSync(jsonPath, 'utf8')), schema);
  if (!errs.length) { console.log(`${OK} ${jsonPath} 符合 ${type} 契約`); return; }
  failed = true;
  console.log(`${NO} ${errs.length} 項不符：`);
  for (const e of errs) console.log(`      ${e}`);
}

// ── shot ──────────────────────────────────────────────────────────
async function cmdShot(paths) {
  head('截圖');
  if (!paths.length) { console.log('  用法：kage shot <html…> [--widths 1280,375]'); return; }
  const chrome = findBrowser();
  if (!chrome) {
    failed = true;
    console.log(`${NO} 找不到 Chrome 或 Edge。設 KAGE_CHROME 指向執行檔，或用你自己的瀏覽器工具截圖。`);
    return;
  }
  console.log(`  ${chrome}`);
  const widths = String(val('--widths', '1280,375')).split(',').map(Number);
  const bgOnly = has('--bg-only');
  const full = has('--full');
  const frames = has('--frames');
  const fixedH = val('--height') ? Number(val('--height')) : null;
  // 手機寬度不能沿用桌面的 16:10 —— 375×234 只截得到導覽列，
  // 那樣的行動裝置檢查等於沒做。窄螢幕一律給 812（iPhone 直式高度）。
  const heightFor = w => fixedH ?? (w < 768 ? 812 : Math.round(w * 0.625));
  for (const p of paths) {
    for (const w of widths) {
      try {
        const r = await shoot(p, { width: w, height: heightFor(w), bgOnly, full, frames });
        console.log(`${OK} ${Array.isArray(r) ? `${r.length} 框：${r[0]} …` : r}`);
      } catch (e) { failed = true; console.log(`${NO} ${p} @${w} — ${e.message}`); }
    }
  }
}

// ── bg ────────────────────────────────────────────────────────────
function cmdBG(paths) {
  head('背景層像素驗收');
  if (!paths.length) {
    console.log('  用法：kage bg <截圖.png…> [--content] [--column x0,x1]');
    console.log('  這八條量的是背景層。請餵背景截圖：');
    console.log('        node scripts/kage.mjs shot <頁面.html> --bg-only');
    console.log('  含內容的截圖裡，紙張表面與米白正文會主宰統計，量到的是前景。');
    console.log('  --content 只跳過第 3、7 條，其餘六條仍會誤報，不是含內容截圖的正解。');
    return;
  }
  const opts = {};
  if (has('--content')) opts.content = true;
  opts.tier = val('--tier', 'c');
  const col = val('--column');
  if (col) opts.column = col.split(',').map(Number);

  const shots = paths.map(p => {
    const m = measure(readFileSync(p), opts);
    console.log(`  ${p}  ${m.width}×${m.height}`);
    return m;
  });
  console.log('');
  for (const r of evaluate(shots, opts)) {
    const mark = r.skip ? '  —' : r.pass ? OK : NO;
    if (!r.pass && !r.skip) failed = true;
    console.log(`${mark} ${String(r.id).padStart(2)}. ${r.name}`);
    console.log(`        ${r.detail}`);
  }
}

// ── dispatch ──────────────────────────────────────────────────────
switch (cmd) {
  case 'check':        cmdSync(false); cmdTokens(); cmdLint(); cmdSchemas(); break;
  case 'schemas':      cmdSchemas(); break;
  case 'content':      cmdContent(files[0], files[1]); break;
  case 'sync':         cmdSync(has('--write')); break;
  case 'tokens':       cmdTokens(); break;
  case 'lint':         cmdLint(); break;
  case 'placeholders': cmdPlaceholders(files); break;
  case 'shot':         await cmdShot(files); break;
  case 'bg':           cmdBG(files); break;
  default:
    console.log(readFileSync(new URL(import.meta.url)).toString()
      .split('\n').slice(1, 18).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
    process.exit(cmd ? 1 : 0);
}

console.log('');
process.exit(failed ? 1 : 0);
