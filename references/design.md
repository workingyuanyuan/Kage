# 影 · kage 版面與元件

排印、間距、元件、互動狀態、動效與簡報的可執行規格。背景材質、顆粒、漏光與色彩見 `material.md`；色彩 token 的唯一真相是 `references/tokens.json`。

---

## 0. 不變量

五條，不可協商。材質與色彩的不變量另見 `material.md`。

1. **襯線為主。** 標題與正文用襯線；無襯線只做導覽、時間、序號、標籤這類結構性輔助，不得主導視覺。
2. **不做懸浮卡片。** 區塊靠分欄、細線、深淺色差、圖片裁切與負空間區隔。陰影上限 `0 1px 0`，禁止大型模糊陰影。
3. **互動狀態雙重表達。** 色彩之外必須有結構訊號（底線、線段延伸、位移、內縮）。Focus 須保留清楚外框，不得只改色相。
4. **裝飾與功能分離。** 細線、編號、印章、裁切裝飾不得阻擋點擊區域，也不得被誤認為按鈕、連結或輸入控制。純裝飾一律帶 `aria-hidden="true"`；承載真實內容的編號與日期**不得**隱藏。
5. **動效必須可降級。** 所有動效都要有 `prefers-reduced-motion` 版本，降級後的行為要逐項定義，不是一律關掉。

---

## 1. 排印 Typography

### 1.1 字體堆疊

```css
:root {
  --serif: "Noto Serif TC", "Source Han Serif TC", "Source Han Serif TW",
           "Songti TC", "PMingLiU", Georgia, serif;
  --sans:  "Helvetica Neue", Arial, "PingFang TC", "Microsoft JhengHei", sans-serif;
  --mono:  ui-monospace, "SF Mono", Consolas, monospace;
}
```

`--serif` 自架，見 `assets/fonts/noto-serif-tc/noto-serif-tc.css`，提供 400 與 600 字重。**拉丁字母也走同一條 `--serif` 鏈**（Georgia 在鏈尾），不另立拉丁字族 —— 中英分屬兩個家族會造成同一段文字裡的排印斷裂。

`--sans` 刻意不自架：它只承擔導覽、日期、序號、標籤這類結構性輔助文字，用系統字體既輕又能拉開與襯線正文的質地差異，且不得主導視覺。

模板一律用變數，不得硬寫字族名 —— 硬寫會讓 `tokens.py --sync` 管不到。

### 1.2 字級階梯（螢幕 px）

除 `label` 與 `meta` 走 `--sans` 外，全部使用 `--serif`。行高為中文值，拉丁見 §1.4。

| 角色 | 桌面 / 行動 | 字重 | 行高 | 字距 中文 / 拉丁 |
|---|---|---|---|---|
| `display` | 64 / 40 | 600 | 1.10 | .04em / .02em |
| `h1` | 44 / 32 | 600 | 1.16 | .04em / .02em |
| `h2` | 30 / 24 | 600 | 1.25 | .03em / .01em |
| `h3` | 22 / 19 | 600 | 1.35 | .02em / 0 |
| `body-lead` | 18 / 17 | 400 | 1.80 | 0 / 0 |
| `body` | 16 | 400 | 1.85 | 0 / 0 |
| `small` | 14 | 400 | 1.70 | 0 / 0 |
| `caption` | 13 | 400 | 1.65 | .04em / .10em |
| `label` | 11 | 400 | 1.60 | .05em / **.28em** · 大寫 |
| `meta` | 11 | 400 | 1.60 | .05em / .28em |

階梯比例約 1.4，`display → h1 → h2 → body` 須有肉眼可辨的落差。**禁止所有文字使用相近尺寸**造成缺乏編輯層級的平面堆疊。

### 1.3 字重

只用 400 與 600。600 給標題、強調詞、按鈕文字，其餘一律 400。不得用 `font-weight: bold` 讓瀏覽器合成假粗體 —— 自架字型只有這兩個字重，合成會破壞筆畫粗細變化。

**強調不靠加粗。** 行內強調用 `--color-text-accent` 換色或細下劃線；`<strong>` 在正文中應該罕見。

### 1.4 字距與數字

- **中文正文字距一律 0**，過度拉開會破壞閱讀節奏。中文標題可到 `.02em–.04em`，是構圖調整而非閱讀調整。
- 拉丁大寫副標、日期、分類、導覽用 `.28em`，形成印刷編目與電影字幕的節奏。
- 數字一律 `font-variant-numeric: tabular-nums`，避免對齊跳動。
- 中文與拉丁的字距差異以 `:lang()` 切換，行高同理（中文 1.85 / 拉丁 1.70）。

### 1.5 行寬

**正文行寬 45–75 拉丁字元。** 拉丁用 `max-width: 60ch`，中文用 `max-width: 38em`（約 28–42 字）。中文正文**不得橫跨整個寬螢幕**，即使容器很寬。

### 1.6 中英雙層標示

主導覽、分類、章節標題採中文主標 + 英文副標，須形成主從，不得等比重複：

```html
<h2 class="section-title">
  材質與顆粒
  <span class="section-title__en">Material &amp; Grain</span>
</h2>
```

字級比約 **3:1**（例如 30px / 11px），副標大寫、`.28em` 字距、`--color-text-muted-on-dark`、`--sans`。

### 1.7 大標題作為構圖元素

章節標題、數字、英文詞組可**超出一般文字欄寬**，與圖片、線條或留白交疊：

```css
.display--bleed { margin-inline: -8vw; position: relative; z-index: 2; }
```

壓在影像上時必須先確保對比：加一層 `--color-background-overlay` 的遮罩元素、細描邊或實色內容表面。**可讀性優先於構圖。**

### 1.8 禁止

超粗圓體、膠囊形標籤、過度居中的行銷式標題、只靠巨大粗體建立層級、用 `--color-accent-hover` 呈現長段內文、純白或純黑文字。

---

## 2. 間距與版面 Spacing & Layout

### 2.1 間距 token

基準 4px，只用階梯上的值：

```css
:root {
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-5: 24px;  --space-6: 32px;  --space-8: 48px;  --space-10: 64px;
  --space-12: 96px; --space-16: 128px;
}
```

| 用途 | 桌面 | 行動 |
|---|---|---|
| 區段之間 | `--space-12` | `--space-8` |
| Hero／開場上下內距 | `--space-10`–`--space-12` | `--space-8` |
| 標題與其內文 | `--space-4` | `--space-3` |
| 段落之間 | `--space-4` | `--space-4` |
| 卡片／面板內距 | `--space-6`–`--space-8` | `--space-5` |
| 頁面左右邊距 | `--space-6` | `--space-4` |

### 2.2 容器與斷點

四階。`≥1440px` 那階存在的理由是雜誌跨頁構圖需要更寬的畫布。

| 階 | 範圍 | 頁面內距 | 容器上限 | 版面 |
|---|---|---|---|---|
| SM | `< 768px` | 16px | 流式 | 單欄 |
| MD | `768–1023px` | 24px | 流式 | 雙欄非對稱 |
| LG | `1024–1439px` | 36px | 1200px | 非對稱多欄 |
| XL | `≥ 1440px` | 36px | 1360px | 雜誌跨頁構圖 |

正文行寬另受 §1.5 限制，不隨容器放大。

### 2.3 非對稱分欄

**不用 6:6 對稱分欄。** 版面採偏移、不等寬分欄、局部重疊與不對稱留白，建立人工編排與實體拼貼感；視覺重心仍須穩定，閱讀順序必須明確。

```css
.split { display: grid; grid-template-columns: 1.618fr 1fr; gap: var(--space-8); }
@media (max-width: 1023px) { .split { grid-template-columns: 1fr; gap: var(--space-6); } }
```

建議比例：`1.618fr 1fr`（黃金比）、`7fr 5fr`、`8fr 4fr` 及其鏡像。

### 2.4 重疊與裁切

圖片、標題、卡片可呈現照片貼附、版面拼接、跨欄的效果，用負 margin 溢出所在欄，靠 `z-index` 分層，**不依賴浮動卡片或立體陰影建立深度**。

```css
.bleed-left { margin-inline-start: -6vw; }
.overlap-up { margin-block-start: calc(var(--space-10) * -1); position: relative; z-index: 2; }
.crop       { overflow: hidden; }   /* 切邊，不加陰影 */
```

### 2.5 負空間

留白**不只代表明亮空白**，也包括低細節暗部、霧化區域與影像中的沉靜空間。具體判準：核心圖文四周至少保留 `--space-6` 的低干擾區域，該區域可以是深色影像的暗部或暗角遮罩，不必是空白，且其中不得出現第二個視覺焦點。

### 2.6 行動裝置

簡化重疊錯位為單欄堆疊、移除跨欄裝飾與大型拼貼。**顆粒強度不隨斷點衰減**（`material.md` §1.3）。

---

## 3. 元件 Components

元件必須服從整體版面，不得是彼此獨立的通用元件庫。

**偽元素預算**：全域材質掛在專用的 `.bg-fixed` 上，不佔用內容元素；局部表面（卡片、面板）用 `::after` 承載自己的顆粒層，`::before` 空著可用。裝飾仍**優先用真實 DOM 元素** —— 它們需要 `aria-hidden`，偽元素給不了。見 §3.11。

以下 CSS 省略顆粒層。

### 3.1 按鈕

圓角一律 `1px`（近乎直角）。

```html
<button class="btn btn-primary"><span class="btn-txt">開始閱讀</span><span
  class="btn-en">Begin</span><span class="btn-arrow" aria-hidden="true">→</span></button>
```

```css
.btn { display:inline-flex; align-items:center; gap:var(--space-2);
       padding:12px 26px; border-radius:1px; cursor:pointer; font-family:var(--sans);
       font-size:12px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; }
.btn-primary   { background:var(--color-accent-primary); color:var(--color-text-on-accent);
                 border:1px solid var(--color-accent-pressed); }
.btn-cta       { background:var(--color-accent-secondary); color:var(--color-text-on-accent);
                 border:1px solid var(--color-accent-pressed); }
.btn-secondary { background:transparent; color:var(--color-text-accent);
                 border:1px solid var(--color-border-accent); }
.btn-text      { background:none; border:none; padding:0; letter-spacing:0;
                 font-family:var(--serif); font-size:15px; text-transform:none;
                 color:var(--color-text-accent); text-decoration:underline;
                 text-underline-offset:5px; text-decoration-thickness:1px; }
.btn-en        { font-size:10px; letter-spacing:.24em; opacity:.72; }
```

**按鈕文字具備排版屬性** —— 可搭配英文副標、箭頭、編號或細線，接近印刷標籤、票券或版面索引。禁止只有孤立的居中文字加大圓角底板。同一畫面最多一個實心主要按鈕。禁用：外發光、立體漸層、塑膠高光、浮動陰影、霓虹邊框、斜角凸起。

### 3.2 導覽

編目式結構：編號 + 中文主標 + 英文副標 + 目前位置標記。選取狀態靠文字色、短線、底線或位置偏移表達，**不得使用大型彩色膠囊背景**。

```html
<nav class="nav"><a class="nav-item is-current" href="#"><span class="nav-code">01</span><span
  class="nav-zh">材質</span><span class="nav-en">Material</span><span
  class="nav-mark" aria-hidden="true"></span></a></nav>
```

```css
.nav      { display:flex; gap:var(--space-5); border-bottom:1px solid var(--color-border-on-dark); }
.nav-item { position:relative; display:inline-flex; align-items:center; gap:var(--space-2);
            padding:12px 0; text-decoration:none;
            font-family:var(--serif); font-size:14px; color:var(--color-text-on-dark); }
.nav-code { font-family:var(--mono); font-size:11px; color:var(--color-text-muted-on-dark); }
.nav-en   { font-family:var(--sans); font-size:11px; letter-spacing:.28em; text-transform:uppercase;
            color:var(--color-text-muted-on-dark); }
.is-current            { color:var(--color-text-accent); }
.is-current .nav-mark  { position:absolute; bottom:-1px; left:0; width:100%; height:2px;
                         background:var(--color-accent-secondary); }
```

### 3.3 卡片與內容區塊

**不做懸浮卡片。** 靠分欄、細線、深淺色差、圖片裁切與負空間區隔。陰影上限如下，不得更重。

**圖像承擔敘事，文字承擔結構。** 禁止「把圖片放進卡片、下面再附一段文字」這種堆疊 —— 圖與文應互相嵌合，由 §3.4 的圖片框架與版面分欄承擔關係，而不是用容器把它們綁在一起。

```css
.panel      { background:var(--color-surface-dark); padding:var(--space-6);
              border:1px solid var(--color-border-on-dark);
              box-shadow:0 1px 0 rgb(0 0 0 / 18%); }   /* 陰影上限，不得更重 */
.panel-line { height:1px; margin:var(--space-4) 0; background:var(--color-border-on-dark); }
```

區塊內的分類標籤走 `--mono` 11px `.12em` `--color-text-muted-on-dark`。邊框 1–2px，禁止純白與高對比純黑邊框。

磨損、紙邊、墨跡與大型刮痕一律克制，不得遮蔽操作元件、降低文字對比或產生可辨識的重複貼圖。分隔線的不完整感用遮罩做，不要畫破圖：

```css
.panel-line--worn { -webkit-mask-image: linear-gradient(90deg, #000 0 62%, transparent 66% 70%, #000 74%);
                            mask-image: linear-gradient(90deg, #000 0 62%, transparent 66% 70%, #000 74%); }
```

### 3.4 圖片框架

印刷編排：白邊、細框、局部裁切、編號標示。不同尺寸圖片可形成不對稱拼貼，但須維持清楚的視覺順序。

```html
<figure class="plate"><div class="plate-wrap"><img src="…" alt="…"><div class="plate-mask"></div></div>
  <figcaption><span class="plate-num">FIG. 04</span>暗房 · 1999</figcaption></figure>
```

```css
.plate      { margin:0; padding:12px; background:var(--color-paper-surface);
              border:1px solid var(--color-border-on-light); }   /* 12px 白邊 = 照片相紙 */
.plate-wrap { position:relative; overflow:hidden; }
.plate-wrap img { display:block; width:100%; height:auto; }
.plate-mask { position:absolute; inset:0; pointer-events:none;
              background:var(--color-background-overlay); }      /* 壓字時才啟用 */
.plate figcaption { display:flex; gap:var(--space-2); margin-top:var(--space-2);
                    font-size:12px; color:var(--color-text-on-light); }
.plate-num  { font-family:var(--mono); font-weight:600; color:var(--color-text-emphasis); }
```

圖說寫**判斷**而非資料範圍：「營收在 Q3 轉正」勝過「2023–2025 年營收」。

**缺圖態。** 素材還沒到位時把 `<img>` 整個換掉，不留空、不填替代圖：

```html
<figure class="plate"><div class="plate-wrap plate-wrap--gap">
    <p class="plate-gap">[需要資料：封面主視覺，建議 4:3、長邊 ≥ 1600px]</p></div>
  <figcaption><span class="plate-num">COVER</span>圖說照常寫完</figcaption></figure>
```

```css
.plate-wrap--gap { aspect-ratio:4/3; display:flex; align-items:center; justify-content:center;
                   padding:var(--space-6); background:var(--color-background-deep);
                   border:1px dashed var(--color-border-on-dark); }
.plate-gap  { font-family:var(--mono); font-size:13px; line-height:1.7;
              letter-spacing:.04em; text-align:center; color:var(--color-text-muted-on-dark); }
```

三件事是這個設計的重點，改動前先讀懂：

- **佔位高度必須與真圖相當。** portfolio 的 `.hero-title-bleed` 是 `margin-top: calc(var(--space-10) * -1)` 的負邊距交疊構圖，它成立的前提是 plate 有高度。缺圖時若只放一行矮字，plate 塌陷，標題會砸在圖說上。`aspect-ratio` 預設 4:3 是既有素材的比例；實際素材不是這個比例時就地覆寫（`style="aspect-ratio:16/9"`）。
- **底色用 `--color-background-deep`，不用紙張色。** 一整片亮紙是頁面上最亮的東西，會蓋過真正的內容；暗場填色的明度接近多數實際影像。
- **說明沿用 `[需要資料：…]` 記法，且必須是單一文字節點。** `kage placeholders` 用 `/\[需要資料[：:][^\]]{1,80}\]/` 撿缺口，把「需要資料」拆進 `<b>` 之類的子元素就撿不到，交付訊息的缺口清單會漏報。

目前有圖位的模板：portfolio 5 個、landing-page 2 個、one-pager / long-doc / equity-report 各 1 個，`-en` 版相同。

### 3.5 表格

無外框，只用橫向分隔線，表頭加一道橘棕頂線。**寬表必須包一層 `overflow-x: auto` 容器並給 `min-width`**，讓表格自己捲動，不得讓整頁溢出。

```css
.table    { width:100%; border-collapse:collapse;
            border-top:2px solid var(--color-border-accent); }
.table th, .table td { padding:12px 8px; border-bottom:1px solid var(--color-border-on-dark); }
.table th { text-align:left; font-weight:400; font-family:var(--sans); font-size:11px;
            letter-spacing:.28em; text-transform:uppercase;
            color:var(--color-text-muted-on-dark); }
.table td { font-family:var(--serif); font-size:14px;
            color:var(--color-text-on-dark); font-variant-numeric:tabular-nums; }
```

### 3.6 引用區

泛黃信紙的主場。左側細直線加內距，不用大引號圖形。

```css
.quote     { display:flex; gap:var(--space-4); margin:0; padding:20px 24px;
             background:var(--color-paper-letter); border:1px solid var(--color-border-on-light); }
.quote-bar { flex-shrink:0; width:3px; background:var(--color-accent-primary); }
.quote p   { margin:0; font-size:16px; line-height:1.7; color:var(--color-text-on-light); }
.quote cite{ display:block; margin-top:var(--space-2); font-style:normal; font-size:13px;
             color:var(--color-text-muted-on-light); }
```

### 3.7 程式碼

`.code` 深層背景 + 1px 邊框；`.code-bar` 是檔名與語言的頁眉條，用 `--color-surface-dark` 與 11px `--mono`；`pre` 內距 `--space-4`、`overflow-x: auto`。

行內程式碼只換字族與顏色，**不換底色** —— 避免在正文裡製造色塊。

### 3.8 表單

輸入框用 `--color-surface-dark` 底 + 1px `--color-border-on-dark` 框，圓角 1px，`--serif` 14px。標籤置於欄位上方，走 `label` 字級。狀態見 §4。

**原生控制項必須改寫**，否則瀏覽器預設樣式會破壞整套材質：

```css
.check, .radio { appearance:none; width:16px; height:16px; cursor:pointer;
                 background:var(--color-surface-dark);
                 border:1px solid var(--color-border-on-dark); }
.radio         { border-radius:50%; }
.check:checked { background:var(--color-accent-primary);
                 border-color:var(--color-accent-pressed); }
.radio:checked { background:var(--color-accent-primary);
                 box-shadow:inset 0 0 0 3px var(--color-surface-dark); }
.select        { appearance:none; padding-right:32px;
                 background:var(--color-surface-dark) no-repeat right 12px center; }
```

`.select` 箭頭用內嵌 SVG `background-image`（`--color-icon-accent` 線稿），不得用原生三角形。

**狀態訊息**（`material.md` §2.3 禁止僅依顏色傳達意義）—— 顏色之外必須有圖示與文字：

```html
<p class="msg msg--error"><svg class="icon" aria-hidden="true">…</svg>編號格式不正確</p>
```

```css
.msg           { display:flex; align-items:center; gap:var(--space-2); font-size:13px; }
.msg--error    { color:var(--color-state-error); }
.msg--warning  { color:var(--color-state-warning); }
.msg--success  { color:var(--color-state-success); }
.msg--info     { color:var(--color-state-info); }
```

### 3.8.1 提示面板

深色頁面的次級面板用 `--color-surface-dark-secondary`，淺色頁面的提示框用 `--color-paper-light`。左側 3px 直線帶狀態色，結構同 §3.3。**狀態色的低透明度底一律用 `color-mix(in srgb, var(--color-state-*) 20%, transparent)`，不得寫 rgb 字面值。**

```css
.callout        { padding:var(--space-5); border-left:3px solid var(--color-state-info);
                  background:var(--color-surface-dark-secondary); }
.callout--paper { background:var(--color-paper-light); color:var(--color-text-on-light); }
```

### 3.9 分頁與箭頭

細長箭頭、短橫線、頁碼或幾何標記，箭頭用 `--color-icon-accent`、頁碼用 `--mono`、目前頁 `--color-text-accent`。

**互動區域須大於視覺符號本身** —— 符號 12px 時點擊區至少 `min-width/height: 44px`。

### 3.10 圖示

內嵌 SVG，單色線稿，`stroke="currentColor"`、`fill="none"`、`stroke-width="1.5"`、`viewBox="0 0 24 24"`，純裝飾者加 `aria-hidden="true"`。顏色靠 `color` 繼承，不寫死在 SVG。

深色背景上預設 `--color-text-on-dark`，淺色表面上 `--color-text-on-light`；可互動 `--color-accent-primary`，次要裝飾 `--color-icon-accent`。禁止多色漸層、玻璃質感、金屬高光、發光描邊、彩色 3D。

**影音控制採儀器式語彙**：播放、暫停、音量、進度用圓環、刻度、細線與簡化符號，呈現老式播放器或印刷圖解的精密感，但必須維持現代操作可用性。

### 3.11 印刷裝飾

版面層的印刷裝飾用真實元素，位於內容層（`z-index: 2` 以上）。背景層的裝飾語彙（幾何弧線、塵點刮痕、鏡像重影、邊緣微型字）另見 `material.md` §3。

`.decor-rule` / `.decor-dash` / `.decor-corner` 是**純裝飾**，一律帶 `aria-hidden="true"`。`.decor-num` 不同 —— 它只是排印處理，承載版本號、日期、文件編號等**真實內容**時不得隱藏。

```css
.decor-rule   { height:1px; background:var(--color-border-on-dark); }      /* 細線 */
.decor-dash   { width:24px; height:2px; background:var(--color-accent-secondary); }
.decor-num    { font-family:var(--mono); font-size:11px; letter-spacing:.18em;
                color:var(--color-text-muted-on-dark); }                   /* 編號、頁碼 */
.decor-corner { position:absolute; width:10px; height:10px;
                border-top:1px solid var(--color-border-on-dark);
                border-left:1px solid var(--color-border-on-dark); }       /* 角標 */
```

角標四角以 `rotate()` 複用同一 class。裝飾不得阻擋點擊，必要時加 `pointer-events: none`。

---

## 4. 互動狀態 Interaction States

### 4.1 通則與三項例外

**Default → Hover → Active**：`--color-accent-primary` → `--color-accent-hover` → `--color-accent-pressed`，次要強調 `--color-accent-secondary`。這條順序涵蓋按鈕、連結、頁籤、分頁、播放控制、表單焦點、裝飾線條與卡片邊框，**不需為個別元件另訂規則**。三項例外要記住：

1. **結構性元件的未選取狀態用中性色。** 導覽項目、未選取頁籤、分頁圓點、卡片邊框與表單預設邊框在深色背景上用米白、灰米或灰棕；強調色只出現在選取、強調與主要操作上。
2. **「選取」不是「按下」。** 頁籤、分頁與導覽的當前項目是**持續狀態**，用 `--color-accent-primary` 加底線或短線，不是 Pressed 的 `--color-accent-pressed`。
3. **深色背景上的 Active 不得落到 `--color-accent-pressed`** —— 明度不足。改為維持可辨識的橘棕或改用米白；在深色背景上 `--color-accent-pressed` 只作邊框與圖示深色層。

### 4.2 狀態矩陣

| 模組 | Default | Hover | Active / Pressed | Focus | Disabled |
|---|---|---|---|---|---|
| 主要按鈕 | bg `--color-accent-primary` | bg `--color-accent-hover` | bg `--color-accent-pressed` | 外框 | `opacity .4` + `not-allowed` |
| 次要按鈕 | 框 `--color-border-accent` | 框與字 `--color-accent-hover` | bg `--color-accent-pressed`，字 `--color-text-on-accent` | 外框 | 低對比灰棕 |
| CTA 按鈕 | bg `--color-accent-secondary` | bg `--color-accent-hover` | bg `--color-accent-pressed` | 外框 | 降飽和 + `opacity .4` |
| 文字連結 | `--color-link` | `--color-link-hover` + 底線 | 淺面 `--color-text-emphasis`；**深面維持 `--color-accent-primary`**（例外 3） | 外框 | 無 hover 反應 |
| 導覽項目 | **`--color-text-on-dark`**（例外 1） | 文字或標記 `--color-text-accent` | **當前項 `--color-accent-primary` + 短線**（例外 2） | 外框 | 不適用 |
| 頁籤／分類器 | **未選取 `--color-text-muted-on-dark`**（例外 1） | `--color-text-accent-hover` | **當前項文字與底線 `--color-accent-primary`**（例外 2） | 外框 | 降對比 |
| 播放按鈕 | 圓框 `--color-icon-accent` | 圓框 `--color-accent-hover` | **圓框維持 `--color-accent-primary`**（例外 3） | 外框 | `opacity .4` |
| 表單欄位 | **框 `--color-border-on-dark`**（例外 1） | 框 `--color-accent-hover` | 框 `--color-accent-primary` | 外框 `--color-focus-ring` | 灰棕背景 + 低對比 |
| 分頁與輪播 | **未選取灰米／灰棕**（例外 1） | 標記 `--color-accent-hover` | **當前項 `--color-accent-primary`**（例外 2） | 外框 | 不適用 |
| 裝飾線條與箭頭 | `--color-accent-secondary` | `--color-accent-hover` | `--color-accent-pressed` | 不適用 | 不適用 |
| 標題強調文字 | `--color-text-accent` | 不設互動 | 不適用 | 不適用 | 不適用 |
| 卡片邊框 | **`--color-border-on-dark`；淺表面 `--color-border-on-light`**（例外 1） | `--color-border-accent` | `--color-accent-pressed`（僅作邊框，合例外 3） | 外框 | 降透明度 |

**深色背景上的橘棕文字另受限**：`--color-text-accent` 於基底只有 3.98:1、於漏光區 2.85:1，因此只能用於大字級或非文字元素，且須位於中央暗區。版面無法保證時改用 `--color-text-on-dark` 加橘棕底線。詳見 `material.md` §2.4。

### 4.3 結構訊號（不可省略）

上表只列色彩。**每個狀態都必須另有結構訊號**，否則違反不變量 #3。

| 狀態 | 除換色外必須有 |
|---|---|
| Hover | 底線、線段延伸，或 1–2px 位移 |
| Active | 輕微內縮 `transform: translateY(1px)` 或 `scale(.99)` |
| Focus | 清楚外框，**不得只改色相** |
| Disabled | 同時改透明度、`cursor` 與 `aria-disabled` |

### 4.4 實作

顏色部分照 §4.2 的矩陣填；以下只列矩陣之外必須有的東西。

```css
:focus-visible      { outline:2px solid var(--color-focus-ring); outline-offset:3px; }
.panel:focus-within { outline:2px solid var(--color-focus-ring); outline-offset:2px; }
.btn:hover          { transform:translateY(-1px); }
.btn:active         { transform:translateY(1px); }
.btn:disabled       { opacity:.4; cursor:not-allowed; pointer-events:none; transform:none; }
.link:hover         { text-decoration:underline; text-underline-offset:5px; }

/* 高對比模式：材質與自訂色會被系統覆寫，結構邊界必須自己撐住 */
@media (forced-colors: active) {
  .btn, .nav-item, .panel, .field input, .field .select, .check, .radio {
    border:1px solid ButtonText;
  }
  .bg-fixed, .surf::after { display:none; }
  :focus-visible { outline:2px solid Highlight; }
}
```

---

## 5. 動效 Motion

動效模擬實體媒介的行為。禁止彈性過強的縮放、果凍回彈、持續漂浮與高頻發光。

### 5.1 語彙對應

| 實體行為 | 實作 |
|---|---|
| 翻頁 | `rotateY(-180deg)` · `perspective: 1200px` · `transform-origin: left center` |
| 抽拉 | `translateX(-100%) → 0`，遮罩層跟隨 |
| 印刷顯影 | `opacity 0→1` + `filter: contrast(140%) blur(3px) → contrast(100%) blur(0)` |
| 遮罩揭露 | `clip-path: inset(0 100% 0 0) → inset(0)` 或 `mask-image` 漸層位移 |
| 紙片滑動 | `translateY(16px) rotate(-1deg) → 0` |
| 照片切換 | 交叉淡入 + `scale(1.02) → 1` |

動效走**兩態 class**：靜置態寫在基底 class，`.is-active` 帶到終點，由 `IntersectionObserver` 或事件加掛。不要用 `@keyframes` 做單次進場 —— 只有 transition 能被 §5.3 一次接管。

```css
.anim-reveal            { clip-path:inset(0 100% 0 0);
                          transition:clip-path 480ms cubic-bezier(.16,1,.3,1); }
.anim-reveal.is-active  { clip-path:inset(0); }
.anim-slip              { opacity:0; transform:translateY(16px) rotate(-1deg);
                          transition:opacity 380ms ease-out, transform 380ms ease-out; }
.anim-slip.is-active    { opacity:1; transform:none; }
```

### 5.2 節奏

| 類型 | 時長 | 緩動 |
|---|---|---|
| 按鈕與導覽回饋 | 150ms | `cubic-bezier(.2,0,0,1)` |
| 表單與小型狀態 | 180ms | `ease-out` |
| 元件展開（卡片／照片） | 300–400ms | `cubic-bezier(.16,1,.3,1)` |
| 頁面／簡報切換 | 450–600ms | `cubic-bezier(.4,0,.2,1)` |

**基礎操作必須立即回應** —— 導覽、按鈕、表單一律走短時長，視覺敘事不得犧牲效率。

### 5.3 降級

`prefers-reduced-motion: reduce` 時**逐項**改變行為，不是一律關掉：

| 原本 | 降級後 |
|---|---|
| 翻頁、抽拉、遮罩揭露、紙片滑動 | 停用 3D／位移／`clip-path`，改 150ms 純淡入至最終狀態 |
| 印刷顯影 | 移除 `filter`，保留 100ms 淡入 |
| 照片切換 | 停用 `scale`，僅保留淡入 |
| 自動輪播 | **停止自動輪播**，保留手動切換 |
| 按鈕位移與內縮 | 移除 `transform`，保留顏色與邊框變化 |
| `scroll-behavior: smooth` | 改 `auto` |
| 視差與持續動畫 | 完全停止 |

全域保險**只歸零會造成暈眩的屬性**（位移、縮放、遮罩、模糊），不得連 `opacity` 一起殺掉 —— 上表要求保留淡入，`transition-duration: .01ms !important` 會把它抹平。

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important; animation-iteration-count: 1 !important;
    transition-property: opacity, color, background-color, border-color !important;
    transition-duration: 150ms !important;
    scroll-behavior: auto !important;
  }
  /* 只靠 clip-path／transform 的動效沒有 opacity 起始態，
     限制 transition-property 之後會直接彈出。補一組淡入。 */
  .anim-reveal { opacity: 0; clip-path: none !important; }
  .anim-reveal.is-active { opacity: 1; }
}
```

**光是限制 `transition-property` 不夠。** `.anim-slip` 本來就有 `opacity: 0 → 1`，降級後位移瞬間歸零、淡入照跑，正確；但 `.anim-reveal` 只靠 `clip-path`，沒有 opacity 起始態 —— 拿掉 clip-path 的過渡之後它會瞬間彈出，而不是上表承諾的淡入。**任何不含 opacity 變化的動效都要在降級區補一組。**

全域保險之外，每個元件仍須依上表提供自己的降級版本 —— **全域規則只保證不會動，不保證降級後仍然好用。**

---

## 6. 簡報 Deck

簡報是這套語言表現力最強的場景 —— 一頁頁揭開，本就是畫冊與唱片內頁的原型。

- **分頁**：**橫向** `scroll-snap-type: x mandatory` + 每頁 `scroll-snap-align: start`，頁寬 `flex: 0 0 100%`、頁高 `100dvh`。書頁與唱片內頁都是左右翻的；縱向 snap 是 scrollytelling 的語彙，不是簡報的。橫向容器不吃垂直滾輪，須自行把滾輪映射成翻頁並節流。
- **鍵盤**：`←` `→` `PageUp` `PageDown` `Space` 翻頁，`Home` `End` 跳首末頁。焦點須跟著移到當前頁供螢幕閱讀器追蹤，但**投影片本身不畫 focus ring** —— 它是程式性焦點目標而非可互動控制項，滿版外框只是視覺噪音。
- **全螢幕**：`requestFullscreen()` 綁在明確按鈕上，不得自動觸發。
- **轉場**：走 §5 遮罩揭露或印刷顯影語彙，中等偏慢節奏。
- **降級**：`prefers-reduced-motion` 下轉場改即時切換，`scroll-behavior` 改 `auto`，翻頁仍可用。
- 頁碼與章節編號用真實 DOM 元素（§3.11）。

