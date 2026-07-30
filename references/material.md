# 影 · kage 材質與色彩

深色背景層、顆粒、漏光與色彩的可執行規格。版面、排印與元件見 `design.md`。

**「畫面」一律指單一可視框** —— 一個瀏覽器視窗、一張投影片，或列印時的一頁。所有構圖與明度規則都以畫面為參考框，**不以文件總長度為參考框**。

---

## 0. 不變量

八條，不可協商。

1. **繪製色是純黑，`#0d0d0d` 是合成結果。** 所有深色色碼都是疊上顆粒後的目標輸出值，不是任何一層的繪製色。把 `#0d0d0d` 當 `background-color` 再疊顆粒會重複計算一次提亮量，成品明度約為目標的 1.5 倍。
2. **顆粒不可削弱。** 每個畫面都必須覆蓋一層肉眼可辨識的細顆粒，且不得加入閃爍或位移動畫。可讀性一律靠局部遮罩解決，不得全域調低顆粒。
3. **顆粒不得用乘算類混合承載。** 在近黑底上 `overlay` / `soft-light` 會把顆粒強度壓縮約一個數量級，肉眼幾乎看不見。一律 `normal`。
4. **中央沉暗、邊緣漏光。** 畫面中央是最暗處，亮度由中心向外單調升高。**不得套用傳統攝影暗角**（中央亮、四角壓暗）——這是本設計語言最容易做反的一條。
5. **暖色漏光是唯一光源。** 色相 18–30°，核心錨定在畫面之外。背景層不得出現暖色（18–30°）與冷色（180–192°）以外的色相。
6. **背景明度天花板 luma 65。** `luma ≥ 48` 的面積 < 4%，`luma ≥ 80` < 0.15%，`luma < 32` ≥ 84%。超過天花板的淺色表面一律屬於內容表面，須以獨立元件承載。
7. **單一強調色系。** 只有橘棕四階，靠深淺、面積與透明度區分狀態。
8. **淺色紙張只作局部內容表面。** 用於長篇文章、表單、資訊面板與引用區，嵌在深色框架內，不得取代全域深色基底。

---

## 1. 背景四層

### 1.1 堆疊

由下而上：

| 層 | 內容 | 混合 |
|---|---|---|
| 1 繪製基色 | `#000000`（暖場可 `#020202`、冷場 `#000203`） | — |
| 2 暖色漏光 | 一至三個橢圓漸層，錨點在畫面邊緣或畫面外 | `screen` |
| 3 中央沉暗（選用） | 僅在背景為全幅影像時需要。純色底不需要 —— 中央之所以最暗，是因為漏光只存在於邊緣 | — |
| 4 顆粒 | 中灰噪點，`opacity: 0.10`，永遠最上層 | `normal` |

**基色與漏光必須在同一個元素的 background stack 上。** `background-blend-mode` 只混合同一元素內部的背景層；跨元素要用 `mix-blend-mode`，而後者遇到任何建立堆疊脈絡的祖先（`isolation`、`transform`、`filter`、`opacity < 1`）就會失效。

```css
html { background-color: #000; }

:root                { --leak-a: 24%; --leak-b: 19%; }  /* A 敘事型 */
.tier-structural     { --leak-a: 15%; --leak-b: 12%; }  /* B 結構型 */
.tier-reading        { --leak-a: 10%; --leak-b:  8%; }  /* C 閱讀型 */

.bg-fixed {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-color: var(--color-background-base);
  background-image:
    radial-gradient(ellipse min(55vw, 900px) 90% at 104% 50%,
                    rgb(255 114 29 / var(--leak-a)) 0%, rgb(255 114 29 / 0%) 100%),
    radial-gradient(ellipse min(45vw, 760px) 70% at -6% 88%,
                    rgb(255 114 29 / var(--leak-b)) 0%, rgb(255 114 29 / 0%) 100%);
  background-blend-mode: screen;
}

.bg-fixed::after {                       /* 顆粒層 */
  content: ""; position: absolute; inset: 0;
  opacity: .10;
  background-image: url("../img/grain-200.png");
  background-size: 200px 200px;
}

main { position: relative; z-index: 1; }
```

### 1.2 錨定

漏光、中央沉暗與顆粒層一律用 `position: fixed` 的獨立元素承載。**不要用 `background-attachment: fixed`** —— iOS Safari 支援不完整，且捲動重繪成本高。

若把漏光掛在整份文件上（`position: absolute` + `inset: 0`），橢圓的垂直半徑會隨文件高度膨脹、錨點落在文件中點，造成中段一片亮、首尾偏暗。

| 情境 | 做法 |
|---|---|
| 一頁一畫面（投影片、不捲動的短頁） | 視窗錨定自動成立。**不得因頁面短而省略漏光** |
| 捲動文件 | 漏光錨定視窗，正文欄位須落在合規暗區內 |
| 捲動容器（modal、側欄、內嵌捲動區） | `fixed` 會錨到視窗而非容器，改用容器內 `position: sticky; top: 0; height: 100%`。此時元素不是視窗，`vw`/`vh` 失準 —— 改用不含 `min()` 的純百分比，以容器 `max-width` 取代半徑上限 |
| 分區段背景 | 各 section 可自帶漏光，僅限高度 ≤ 1.5 視窗的區段；更高者交由全域層處理。相鄰區段的漏光方位須交替 |
| 非全幅容器（卡片、面板、側欄） | 尺度太小，**不套用中央沉暗構圖**，只用表面色加顆粒層 |

局部表面用 `.surf`，它只掛顆粒、不掛漏光，`::before` 保持空著給元件用：

```css
.surf { position: relative; }
.surf > * { position: relative; z-index: 2; }
.surf::after {
  content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  opacity: .10;
  background-image: url("../img/grain-200.png");
  background-size: 200px 200px;
}
.surf--card   { background-color: var(--color-surface-dark); }
.surf--sub    { background-color: var(--color-surface-dark-secondary); }
.surf--paper  { background-color: var(--color-paper-surface);  color: var(--color-text-on-light); }
.surf--light  { background-color: var(--color-paper-light);    color: var(--color-text-on-light); }
.surf--letter { background-color: var(--color-paper-letter);   color: var(--color-text-on-light); }
/* 紙張走 multiply，才會讀成纖維而非反光 */
.surf--paper::after, .surf--light::after, .surf--letter::after {
  opacity: .055; mix-blend-mode: multiply;
}
```
| 超寬螢幕 | 漏光水平半徑須設上限 `min(55vw, 900px)`，否則 21:9 以上會擴散成整片暖色 |
| 窄螢幕（≤ 1023px） | 漏光半徑與正文欄同為視窗寬度的比例，等比縮小後內容佔比反而變大而伸進漏光。C 級須降至 6% / 5%、B 級降至 9% / 7%，否則正文欄的暗區條件不成立。**顆粒強度不隨斷點改變。** |
| 列印 | `@media print` 停用深色背景與顆粒層，改用淺色紙張色 |
| `prefers-contrast: more` | 可降低漏光強度，但**顆粒層必須保留** —— 顆粒是材質而非裝飾，其振幅不影響文字對比 |

### 1.3 顆粒規格

| 項目 | 規格 |
|---|---|
| 彩度 | 純灰度，R/G/B 三通道振幅相等 |
| 粒徑 | 1–2 device px 高頻噪點，不得團塊化 |
| 平鋪單元 | 180–220px（基準 200px）。這是**重複週期**，與粒徑是兩回事 |
| 強度 | 全域層 luma SD **6–14**（基準 8）；影像場景自身的顆粒維持 SD 1–6，避免與全域層疊加後過噪 |
| 合成結果 | 疊在純黑上 mean 約 **12.8**、SD 約 **7.4**（等效於 `--color-grain`） |

**標準來源**：`assets/img/grain-200.png` —— 200×200、8-bit 灰階、mean 127.73、SD 75.10，以 `opacity: 0.10` `normal` 疊加得 mean 12.77、SD 7.51。由 `scripts/make-grain.mjs` 以固定種子產生，可重現。

**單檔交付的備援**：需要輸出不帶外部資產的單一 HTML 時，改用程序式噪點。見 §1.6 的校正方式。

### 1.4 漏光

自畫面邊緣向內衰減，涵蓋畫面寬度約 27%：

`--color-leak-core`（最亮點，面積 < 0.5%，背景明度絕對上限）→ `--color-leak-4`（邊緣峰值）→ `--color-leak-3`（主體）→ `--color-leak-2`（中段）→ `--color-leak-1`（最外緣）→ `--color-background-global`（中性底）。

中性底依場景取值：中性場 `--color-background-global`，暖場 `--color-background-field-warm`，冷場 `--color-background-field-cool`。冷色受光面用 `--color-tint-cool`（選用，多數畫面完全不含冷色）。中央沉暗核心用 `--color-background-deep`。

整條衰減不需逐段列停點，用單一光源色 `--color-leak-source` 即可重現：純黑底上以 `screen` 疊加，再壓 `opacity: 0.10` 的顆粒層，邊緣合成為 `#3f2413`。

核心原則上錨定在畫面之外，畫面內只看得到衰減尾端；核心若必須落在畫面內，明度上限為 luma 30。**禁止置中的對稱圓形光暈。**

### 1.5 低頻材質層（選用，預設不加）

底材紋理能量集中在 1–4px 並向低頻單調遞減，因此純色底只需要基色、漏光、顆粒三層。僅在刻意表現紙張塗層不勻時加入 64–320px 尺度的無彩度斑駁材質，置於漏光之下（`background-blend-mode: screen, screen, normal`），振幅上調約 25%（會被漏光的 alpha 衰減）。代價是暗場面積下降約 2 個百分點。

### 1.6 兩個靜默失效

兩者都不拋錯，只會讓成品悄悄不符規格。**必須主動偵測。**

**① 漸層半徑用 `vw`，不能用 `%`。**

漸層半徑的百分比相對漸層框解析，無法與長度混入同一數學函式 —— `min(55%, 900px)` 不被支援。而 `background-image` 只要含任何無效值就**整個退回 `none` 且不報錯**，成品會完全沒有漏光。

垂直半徑維持 `%`：`vh` 對應 large viewport，而 `position: fixed` 元素對應當下的 visual viewport，行動瀏覽器工具列收合時兩者不一致。

偵測：`CSS.supports('background-image', …)`，並確認 `getComputedStyle(el).backgroundImage !== 'none'`。

**② 顆粒的分布寬度不能靠 `opacity` 修正。**

mean 與 SD 被同一個 `opacity` 縮放，故輸出的 SD/mean 恆等於噪點來源的比值。目標比值 **0.578**（mean 12.8、SD 7.4）：

| 來源 | mean / SD | 比值 | 合成@0.10 |
|---|---|---|---|
| 灰階噪點 PNG | 127.7 / 75.1 | 0.588 | mean 12.77 · SD 7.51 ✓ |
| `feTurbulence` 原生 | 127.5 / 19.9 | 0.156 | mean 12.75 · SD 1.99 ✗ |

任何 `opacity` 都救不了原生 `feTurbulence`。解法是用 `feComponentTransfer` 對 0.5 做**對稱**線性拉伸 —— 對稱使 mean 恆為 128，只有 SD 改變。`intercept` 必須等於 `0.5 − slope ÷ 2`：

| slope | intercept | 源 SD | 合成 SD |
|---|---|---|---|
| 2.5 | −0.75 | 49.6 | 4.96 |
| 3.5 | −1.25 | 66.5 | 6.65 |
| **4.2** | **−1.60** | **≈74** | **≈7.4** |
| 5.5 | −2.25 | 86.3 | 8.63 |

另須加 `color-interpolation-filters="sRGB"`（預設 `linearRGB` 會讓 mean 落在 187）與 `feFuncA type="discrete" tableValues="1"`（把 alpha 壓成全不透明）。`opacity` 維持 0.10，**SD 偏離時調 `slope`，不要調 `opacity`** —— 動 opacity 會把 mean 一起帶偏。

拉伸後兩端會被裁切，因此 SD 對 slope 呈**次線性**，依比例外插會低估。`slope 4.2` 約有 15% 的像素被壓到純黑或純白，顆粒略帶椒鹽感 —— 這是程序式方案的固有代價，圖檔沒有這個問題。**優先用噪點圖檔，SVG 只作為無素材時的替代。**

---

## 2. 色彩

完整 token 定義在 `references/tokens.json`，是唯一真相。模板的 `:root` 必須與它一致，由 `scripts/tokens.py --sync` 把關。

### 2.1 調色盤

| 角色 | Token | 用途 |
|---|---|---|
| 主強調色 | `--color-accent-primary` | 主要文字、主要按鈕、頁籤、選取狀態、重點連結 |
| 次要強調色 | `--color-accent-secondary` | CTA、播放按鈕、導覽標記、箭頭、進度、裝飾線條。限小面積 |
| 高亮橘 | `--color-accent-hover` | Hover、Focus 外框、作用中項目。僅互動回饋，不作靜態背景 |
| 深橘棕 | `--color-accent-pressed` | Active／Pressed、邊框、圖示深色層 |
| 深棕表面 | `--color-surface-dark` | 深色卡片、浮層、頁尾、控制面板 |
| 次級深棕 | `--color-surface-dark-secondary` | 次級導覽、局部區塊。luma 55，已接近明度天花板 |
| 淺色內容紙張 | `--color-paper-surface` | 長篇文章、表單、內容卡片 |
| 高亮紙張 | `--color-paper-light` | 重點閱讀區、提示框、實心橘按鈕的文字色 |
| 泛黃信紙 | `--color-paper-letter` | 引用區、檔案式內容、手稿式文本 |

兩個深棕是**內容表面色，不是背景色**，僅能作為有明確邊界的元件表面，不得鋪滿為畫面背景。淺色紙張同樣不得呈現完全均勻的純色，須保留明顯顆粒；正文容器內可局部降低強度。

### 2.2 互動狀態順序

**Default → Hover → Active／Pressed**：`--color-accent-primary` → `--color-accent-hover` → `--color-accent-pressed`，次要強調 `--color-accent-secondary`。此順序適用於按鈕、連結、頁籤、分頁、播放控制、表單焦點、裝飾線條與卡片邊框，不需為個別元件另訂規則。

**三項例外：**

1. **結構性元件的未選取狀態用中性色。** 導覽項目、未選取頁籤、分頁圓點、卡片邊框與表單預設邊框在深色背景上使用米白、灰米或灰棕；強調色只出現在選取、強調與主要操作上。
2. **「選取」不是「按下」。** 頁籤、分頁與導覽的當前項目是**持續狀態**，用 `--color-accent-primary` 加底線或短線，不用 Pressed 的 `--color-accent-pressed`。
3. **深色背景上的 Active 不得落到 `--color-accent-pressed`**（明度不足），改為維持可辨識的橘棕或改用米白。在深色背景上 `--color-accent-pressed` 只作邊框與圖示深色層。

**`--color-accent-primary` 依元素類型的用法**：深色背景文字直接作 `color`；實心按鈕作 `background-color`；外框按鈕同時作 `color` 與 `border-color`，背景透明；文字按鈕須搭配底線、箭頭或幾何符號，不依賴色彩單獨傳達；選取狀態搭配底線、細框、圓點或短線，禁止大面積發光。

### 2.3 文字、邊框與狀態色

- **深色背景**：主標題用 `--color-text-on-dark`，內文用同色或 `--color-text-muted-on-dark`，次要文字與日期編號用 muted 搭配較寬字距。
- **淺色表面**：主標題用 `--color-text-on-light`，內文用 `--color-text-muted-on-light`。
- **邊框**：深色背景上用 `--color-border-on-dark` 或 `--color-border-accent`；淺色表面上用 `--color-border-on-light`。互動邊框 `--color-border-accent`，Hover `--color-accent-hover`，裝飾箭頭與短線 `--color-icon-accent`。寬度 1–2px，**禁止純白與高對比純黑邊框**。分隔線可呈現輕微磨損或不完整，模擬印刷誤差。
- **系統狀態色**須低飽和並融入暗色域：`--color-state-success` 低飽和橄欖綠、`--color-state-warning` 暗赭黃、`--color-state-error` 低飽和磚紅、`--color-state-info` 低飽和灰藍。四者的低透明度底一律用 `color-mix(in srgb, var(--color-state-*) 20%, transparent)`，不得寫 rgb 字面值。**所有狀態均須搭配文字或圖示，禁止僅依顏色傳達意義。**

### 2.4 對比與可存取性

| 前景色 | 於基底 `#0d0d0d` | 於漏光峰值 `#432513` |
|---|---|---|
| `--color-text-on-dark` 米白正文 | 15.5 : 1 | 11.0 : 1 |
| `--color-text-accent` 強調色 | **3.98 : 1** | **2.85 : 1** |

米白正文在任何漏光強度下都安全，**不需要為了對比而削弱漏光**。

但 `--color-text-accent` 只達大字級的 3:1、不足正文的 4.5:1，落到漏光區更只剩 2.85:1。因此：

> **深色背景上的橘棕文字只能用於大字級或非文字元素，且必須位於中央暗區。版面若無法保證，改用 `--color-text-on-dark` 並以底線或符號表達可互動性。**

- `--color-accent-pressed` 不得作深色背景上的小尺寸文字或細線；小字不得用低透明度橘色。
- Focus、Disabled 與高對比模式的結構規定見 `design.md` §4。
- 文字可讀性透過局部暗部遮罩或內容表面處理，**只在文字正下方局部降低紋理強度**，不得以全域削弱顆粒作為解法。

### 2.5 面積比例

| 色域 | 完整畫面 |
|---|---|
| 深色背景與暗色表面 | 65–80% |
| 米白文字、灰米結構色與局部紙張 | 15–25% |
| 橘棕強調色 | 5–10% |
| 其中 `--color-accent-hover` | < 2% |

背景層本身另有更嚴格的規範（不含前景元件時）：暖色像素 20–50%，冷色若出現可佔至 75%，塵點與刮痕合計 < 0.1%。

面積百分比無法在 CSS 裡驗證，因此改寫成三條**讀原始碼就能判定**的預算：

1. 單一畫面內，實心橘底元素（`.btn-primary` / `.btn-cta`）**至多 1 個**。
2. `--color-accent-hover` **禁止**作為任何靜態元素的 `background`，只能出現在 `:hover` / `:focus-visible` / `.is-current` 規則裡。
3. `.surf--paper` 系列的累計**面積**（非高度）不得超過整頁的 25%。長篇文件的正文應坐在深色底上，紙張留給引用區、提示框與附註。

---

## 3. 通用裝飾語彙

純 CSS／SVG 可生成，不需影像素材，與題材無關。**本專案不使用需要影像素材的圖像母題**（漂浮相紙、相框、捲曲膠卷、齒孔條），也不使用背景排版大字。

| 語彙 | 規格 |
|---|---|
| **幾何細線與弧線** | 1px 大半徑圓弧或構圖線，不裁切、直接穿出畫面外，顏色 `--color-hairline` —— 這是**繪製色**（低透明度米白），疊在基底上的合成值約 `#262523`，與設計稿標註的 `#272727` 同一件事 |
| **塵點與刮痕** | 塵點 `--color-dust`、1px 縱向斷續刮痕 `--color-scratch`，合計面積 < 0.1%。實作見下 |
| **鏡像重影** | 既有英文小標下方疊一層垂直翻轉的極低透明度副本（`transform: scaleY(-1)` 加漸層遮罩）。這是既有文字的處理手法，**不是新增內容** |
| **邊緣編目微型字** | 極小字級、超寬字距。屬材質而非資訊，不得承載必要資訊。**內容必須取自該頁既有的中繼資料**（標題、版本、日期、分類），不得杜撰 |

塵點與刮痕用真實元素散置，位置寫死不隨機 —— 隨機會讓每次重載的顆粒分布不同，違反「顆粒為靜態材質」。面積預算換算：1280×800 的畫面上限約 1000px²，即約 12 個 2px 塵點加 4 條 80px 刮痕。

```css
.decor-dust    { position:absolute; width:2px; height:2px; border-radius:50%;
                 background:var(--color-dust); }
.decor-scratch { position:absolute; width:1px; opacity:.55;
                 background:var(--color-scratch); }
```

裝飾不得阻擋點擊區域，也不得被誤認為可互動元件。純裝飾元素一律帶 `aria-hidden="true"`；承載真實內容的編號、日期、版本號**不得**隱藏。

---

## 4. 頁型分級

| 級別 | 典型畫面 | 漏光 alpha | 幾何細線 | 塵點刮痕 | 鏡像重影 | 邊緣微型字 | 裝飾種類上限 |
|---|---|---|---|---|---|---|---|
| **A 敘事型**（觀看為主，停留短） | 首屏、封面、章節扉頁、標題投影片 | 0.24 / 0.19 | 可 | 可 | 可 | 可 | 3 |
| **B 結構型**（掃視與操作為主） | 列表、儀表板、產品頁、導覽、內容投影片 | 0.15 / 0.12 | 克制 | 可 | 不建議 | 可 | 2 |
| **C 閱讀型**（正文超過約 300 字） | 文章、書信、更新日誌、表單、報告 | 0.10 / 0.08 | 至多一條 | 面積減半 | 禁止 | 禁止 | 1 |

分級依據是**可用暗區的寬度**，不是美感偏好：正文欄位所覆蓋的背景，luma 最大值須 ≤ 20 且欄內極差 ≤ 8。三級的合規暗區依序約為畫面中央 56%、75%、94% 寬。

### 本專案的對映

| 模板 | 級別 |
|---|---|
| portfolio · slides · landing-page | **A** |
| one-pager · long-doc · letter · changelog · equity-report | **C** |

**C 級的正文欄必須置中，且寬度不超過 `--measure`。** 受這條約束的只有正文欄；metrics、表格、側欄面板不算正文。

實測 646px 欄寬（漏光 0.10 / 0.08，取正文區 luma 最大值 / 欄內極差）：

| 視窗 | 置中 646px | 1200px 容器內靠左的 7:5 文字欄 |
|---|---|---|
| 1920×1080 | 16.1 / 3.3 ✓ | 17.2 / 4.4 ✓ |
| 1440×900 | 18.8 / 6.1 ✓ | 20.2 / 7.4 ✗ |
| 1280×800 | 19.8 / 7.0 ✓ | 21.3 / 8.6 ✗ |

容器寬度固定時，視窗越窄容器佔比越大：1200px 容器在 1920 視窗上只佔 62%（安全區內），到 1280 就佔 94%，邊緣正好壓在漏光起點。因此**不能只靠容器上限，正文欄本身必須置中收窄**。

---

## 5. 驗收

以**單一畫面大小**的截圖為單位檢查。捲動文件須在頂端、中段、底端至少三個位置各取一張。

| # | 條件 |
|---|---|
| 1 | 中央 20% 區域平均 luma **<** 邊緣 10% 區域平均 luma |
| 2 | 各截圖之間，邊緣 10% 平均 luma 差異 ≤ ±10% |
| 3 | `luma ≥ 48` 面積 < 4%；`luma ≥ 80` < 0.15%；最大值 ≤ 65；`luma < 32` ≥ 84% |
| 4 | 顆粒 mean 約 12.8 **且** SD 落在 6–14 |
| 5 | 高通殘差的 R/G/B 三通道振幅差異 < 5% |
| 6 | 乾淨區域在 64px 與 128px 尺度的殘差 SD < 0.7 |
| 7 | 背景像素色相僅落在 18–30° 或 180–192°，或飽和度 < 0.08 |
| 8 | 正文欄位覆蓋的背景 luma 最大值 ≤ 20、欄內極差 ≤ 8 |

第 2 條專門用來擋「把漏光綁在文件高度上」的錯誤 —— 那個錯誤**單看第 1 條擋不下來**，兩種錨定方式的中央／邊緣關係都會通過。

第 4 條的 mean 與 SD 須**分別**檢查：只驗一項會漏掉分布過窄（SD 不足）或提亮過頭（mean 超標）。

驗收由 `scripts/check-bg.mjs` 執行，吃截圖 PNG 輸出八項指標。
