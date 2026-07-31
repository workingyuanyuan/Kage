// 透過 DevTools Protocol 截圖。Node 內建 WebSocket，不需要任何依賴。
//
// 為什麼不用 `chrome --screenshot`：Windows 上的瀏覽器視窗有最小寬度，
// `--window-size=375,812` 實際拿到的版面視窗是 512px，然後把 512 寬的畫面
// 裁切成 375 寬的 PNG。看起來就像整頁水平溢出 —— 但頁面是好的，說謊的是工具。
// 實測：探針頁在 --window-size=375 下自報 clientWidth=512。
//
// Emulation.setDeviceMetricsOverride 設的是版面視窗，不受視窗最小尺寸限制。
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createServer } from 'node:net';

const freePort = () => new Promise((res, rej) => {
  const s = createServer();
  s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pageTarget(port, deadline) {
  while (Date.now() < deadline) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* 還沒起來 */ }
    await sleep(120);
  }
  throw new Error('等不到 Chrome 的偵錯埠');
}

/** 一個極簡的 CDP 用戶端：送出指令、等對應 id 的回覆。 */
function client(ws) {
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    msg.error ? p.reject(new Error(`${msg.error.message}（${JSON.stringify(msg.error)}）`)) : p.resolve(msg.result);
  });
  return (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}

/**
 * 用 CDP 截圖並寫檔。
 * @param {string} chrome 執行檔路徑
 * @param {string} fileUrl file:// 網址
 * @param {{width:number,height:number,out:string,fullPage?:boolean,settleMs?:number}} o
 */
export async function captureCDP(chrome, fileUrl, { width, height, out, fullPage = false, frames = false, settleMs = 400 }) {
  const port = await freePort();
  const proc = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    // 允許讀取同目錄的字型與顆粒圖
    '--allow-file-access-from-files',
    'about:blank',
  ], { stdio: 'ignore' });

  let ws;
  try {
    const target = await pageTarget(port, Date.now() + 15000);
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', () => rej(new Error('CDP WebSocket 連線失敗')), { once: true });
    });
    const send = client(ws);

    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    await send('Page.navigate', { url: fileUrl });
    // file:// 沒有網路事件可等，字型與圖片載入給一段固定時間
    await sleep(settleMs);

    // 整頁截圖不能用 captureBeyondViewport：背景材質掛在 position: fixed 的
    // .bg-fixed 上，那種擷取方式只讓 fixed 元素覆蓋一個視窗高度，底下會是
    // 純黑 —— 漏光與顆粒都斷掉，內容還在。實測 3906px 高的長文，底部 luma
    // 只有 1.0 而頂部是 23.1。
    //
    // 改成兩段：先量內容高度，再把視窗本身設成那個高度，fixed 自然覆蓋全頁。
    // 代價是漏光的垂直半徑是視窗高度的百分比，視窗拉高後漸層也跟著拉高 ——
    // 那是 CSS 對該尺寸視窗的正確渲染，但與使用者在一般視窗看到的構圖不同。
    if (fullPage) {
      const { cssContentSize } = await send('Page.getLayoutMetrics');
      await send('Emulation.setDeviceMetricsOverride', {
        width, height: Math.ceil(cssContentSize.height), deviceScaleFactor: 1, mobile: width < 768,
      });
      await sleep(200);
    }

    // 逐框輸出。設計語言的參考框是「單一可視框」而非文件總長度 —— 一道漏光
    // 拉伸成 3900px 不是任何讀者看得到的構圖，中央沉暗只在一個框內成立。
    // 所以長文件的正確影像是 N 個等高的框，每一框都帶正確的背景。
    //
    // 「一框」由文件自己的分頁方向決定，不是永遠垂直。slides 的 .deck 是
    // `scroll-snap-type: x mandatory` 的水平捲動容器：文件高度剛好一個視窗，
    // 垂直切框永遠只出 f01，第 2 頁之後不可達。所以先問頁面往哪個方向分頁，
    // 再照那個方向走 —— 這是讓既有旗標對所有模板都成立，不是新增模式。
    if (frames) {
      await send('Runtime.enable');
      const probe = `(() => {
        for (const el of document.querySelectorAll('*')) {
          const t = getComputedStyle(el).scrollSnapType || '';
          if (/^x[\\s]|^x$/.test(t) && el.scrollWidth > el.clientWidth + 1) {
            window.__kageDeck = el;
            // 捲動動畫會讓截圖拍到中間幀，量測期間關掉。
            el.style.scrollBehavior = 'auto';
            return { horizontal: true, n: Math.round(el.scrollWidth / el.clientWidth) };
          }
        }
        return { horizontal: false };
      })()`;
      const { result } = await send('Runtime.evaluate', { expression: probe, returnByValue: true });
      const deck = result.value ?? { horizontal: false };

      const { cssContentSize } = await send('Page.getLayoutMetrics');
      const n = deck.horizontal
        ? Math.max(1, deck.n)
        : Math.max(1, Math.ceil(cssContentSize.height / height));
      const outs = [];
      for (let i = 0; i < n; i++) {
        await send('Runtime.evaluate', {
          expression: deck.horizontal
            ? `window.__kageDeck.scrollLeft = ${i} * window.__kageDeck.clientWidth`
            : `window.scrollTo(0, ${i * height})`,
        });
        await sleep(120);
        const { data } = await send('Page.captureScreenshot', { format: 'png' });
        const p = out.replace(/\.png$/, `-f${String(i + 1).padStart(2, '0')}.png`);
        mkdirSync(dirname(resolve(p)), { recursive: true });
        writeFileSync(p, Buffer.from(data, 'base64'));
        outs.push(p);
      }
      return outs;
    }

    const { data } = await send('Page.captureScreenshot', { format: 'png' });

    mkdirSync(dirname(resolve(out)), { recursive: true });
    writeFileSync(out, Buffer.from(data, 'base64'));
    return out;
  } finally {
    try { ws?.close(); } catch { /* ignore */ }
    proc.kill();
  }
}
