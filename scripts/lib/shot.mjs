// 用系統上的 headless Chrome 把 HTML 檔渲染成 PNG。
//
// SKILL.md 把「1280 與 375 兩個寬度看過畫面」列為硬性步驟，`kage bg` 也需要
// PNG 才能量 —— 但倉庫本來沒有任何 HTML→PNG 的路徑，那條規則等於沒有工具支撐。
//
// 刻意不引入 puppeteer／playwright：那會為了截圖背上一個上百 MB 的瀏覽器下載，
// 而任何開發或 CI 環境幾乎都已經有 Chrome 或 Edge。找不到就明說找不到。
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';

import { resolve, dirname, join, basename, extname } from 'node:path';
import { captureCDP } from './cdp.mjs';

const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];

export function findBrowser() {
  if (process.env.KAGE_CHROME && existsSync(process.env.KAGE_CHROME)) return process.env.KAGE_CHROME;
  return CANDIDATES.find(existsSync) || null;
}

/**
 * 截一張圖。回傳輸出路徑。
 *
 * 一定要用檔案原本的位置開 file://：字型與顆粒圖都是相對路徑引用，
 * 把 HTML 複製到別處會讓兩者靜默失效 —— 而字型退回無襯線是看得出來卻
 * 不會報錯的那種壞法。
 */
export async function shoot(htmlPath, { width = 1280, height = 800, out, full = false, frames = false, bgOnly = false } = {}) {
  const chrome = findBrowser();
  if (!chrome) throw new Error(
    '找不到 Chrome 或 Edge。設 KAGE_CHROME 指向執行檔，或改用你自己的瀏覽器工具截圖。');

  let abs = resolve(htmlPath);
  if (!existsSync(abs)) throw new Error(`檔案不存在：${abs}`);
  const target = out ?? join(dirname(abs),
    `${basename(abs, extname(abs))}${bgOnly ? '-bg' : ''}-${width}.png`);
  mkdirSync(dirname(resolve(target)), { recursive: true });

  // 背景層量測必須拍到「只有背景」的畫面。含內容的截圖裡，中央的紙張表面
  // 與米白正文會直接主宰明度統計 —— 量到的是前景，卻會被讀成背景壞了。
  // 暫存檔一定要放在原檔同目錄：字型與顆粒圖都是相對路徑。
  let temp = null;
  if (bgOnly) {
    const html = readFileSync(abs, 'utf8');
    // 背景層 = bg-fixed 加上同屬背景材質的裝飾母題（弧線、塵點刮痕、邊緣微型字）。
    // 把母題一起藏掉會讓它們的亮像素逃過面積預算檢查 —— 而那正是要檢查的東西。
    const keep = '.bg-fixed, .decor-arc, .decor-grit, .edge-code';
    const hide = `<style>body > *:not(${keep}){display:none !important}</style>`;
    if (!html.includes('</head>')) throw new Error(`找不到 </head>，無法注入 bg-only 樣式：${abs}`);
    temp = join(dirname(abs), `.kage-bgonly-${process.pid}-${width}.html`);
    writeFileSync(temp, html.replace('</head>', `${hide}\n</head>`));
    abs = temp;
  }

  const fileUrl = `file:///${abs.replace(/\\/g, '/')}`;
  try {
    // CDP 路徑：版面視窗由 Emulation 指定，才拿得到真正的 375px。
    return await captureCDP(chrome, fileUrl, { width, height, out: target, fullPage: full, frames });
  } finally {
    if (temp) rmSync(temp, { force: true });
  }
}

