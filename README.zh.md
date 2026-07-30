<div align="center">
  <h1>影</h1>
  <p><b>光在畫面外，影在畫面裡。</b></p>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-a95d35.svg?style=flat-square" alt="License"></a>
  <a href="assets/fonts"><img src="https://img.shields.io/badge/font-OFL-a95d35.svg?style=flat-square" alt="Font licence"></a>
  <a href="SKILL.md"><img src="https://img.shields.io/badge/runtime-Node-a95d35.svg?style=flat-square" alt="Runtime"></a>
  <p><a href="README.md">English</a></p>
</div>

## 什麼是影？

影（kage，かげ）是光留下的痕跡。給 AI 代理一段需求，它交回一份排好版的 HTML 文件：單頁方案、長篇報告、正式書信、作品集、更新日誌、個股研報、簡報、產品落地頁，八種。

這套設計語言要重現的，是復古而精緻的紙質書與印刷品落在手上的重量。啞光的表面、印刷的線條、受控的磨損、翻頁時指腹感覺到的纖維。螢幕沒有這些，所以要把它們一層一層疊回去，直到畫面上的銳利被磨掉。

光源錨在畫面之外。畫面裡只看得到它衰減的尾端，於是中央沉暗、邊緣亮出——與相機的暗角相反，因為這裡的光從來不從正面來。文字落在最暗的那一塊，讀起來像油墨壓進了紙裡。

材質承擔氣氛，文字承擔結構。這是分工，也是紀律：版面上該清楚的地方不許被氣氛蓋掉。

## 展示

八種類型各一份，全是實際產出。點縮圖開完整文件。

| 類型 | 預覽 | 題材 |
|---|---|---|
| one-pager | [![單頁方案](assets/demos/demo-archive-proposal-1280.png)](assets/demos/demo-archive-proposal.html) | 市立文獻館的紙本歸檔上線提案 |
| long-doc | [![長篇報告](assets/demos/demo-index-engine-1280.png)](assets/demos/demo-index-engine.html) | 離線全文索引引擎的架構決策紀錄 |
| equity-report | [![個股研報](assets/demos/demo-packaging-equity-1280.png)](assets/demos/demo-packaging-equity.html) | 虛構半導體封測公司的研究報告 |
| portfolio | [![作品集](assets/demos/demo-document-portfolio-1280.png)](assets/demos/demo-document-portfolio.html) | 文件與排版設計作品集 |
| letter | [![正式書信](assets/demos/demo-review-notice-1280.png)](assets/demos/demo-review-notice.html) | 保存環境的年度覆核通知 |
| changelog | [![更新日誌](assets/demos/demo-aperture-changelog-1280.png)](assets/demos/demo-aperture-changelog.html) | 虛構離線歸檔工具的版本紀錄 |
| slides | [![簡報](assets/demos/demo-legibility-talk-1280.png)](assets/demos/demo-legibility-talk.html) | 靜態檔案長期可讀性的演講 |
| landing-page | [![產品落地頁](assets/demos/demo-aperture-site-1280.png)](assets/demos/demo-aperture-site.html) | 該工具的產品頁 |

示範裡的公司、人物與數據全部虛構，只用於呈現版面。

## 安裝

把倉庫放到代理讀得到 skill 的位置：

```bash
git clone https://github.com/workingyuanyuan/Kage.git
```

接著把目錄移進代理的 skill 路徑。代理只讀 `SKILL.md`，其餘規格與模板由它按需開啟。

環境需求兩項：

| 需求 | 用途 |
|---|---|
| Node.js | 工具鏈全是純 Node，零外部依賴 |
| Chrome 或 Edge | 截圖與像素驗收。偵測不到時設 `KAGE_CHROME` 指向執行檔 |

## 使用

代理側的流程：接到需求 → 選類型 → 核實來源與素材缺口 → 定語域與頁型分級 → 依內容契約寫稿 → 澆進模板 → 驗證。素材缺了就在版面上標成缺口，不填替代品。

人可以直接跑的指令：

```bash
node scripts/kage.mjs check                        # 共用 CSS 區塊、色彩 token、模板 lint、內容契約
node scripts/kage.mjs content <type> <稿件.json>    # 稿件的語意形狀與長度上限
node scripts/kage.mjs placeholders <完成的檔案>      # 殘留的 {{}} 與標記的資料缺口
node scripts/kage.mjs shot <檔案.html> --widths 1280,375
node scripts/kage.mjs shot <檔案.html> --bg-only    # 只有背景層的截圖
node scripts/kage.mjs bg <背景截圖.png>              # 背景層八條像素驗收
```

長文件另有逐框輸出：

```bash
node scripts/kage.mjs shot <檔案.html> --height 1800 --frames
```

這套設計語言的參考框是單一可視框，不是文件總長度。一道漏光拉伸成 3900px，沒有任何讀者看得到那個構圖。所以長文件的正確影像是 N 個等高的框，每框各自帶完整的背景。

## 設計

**十六份模板，一段共用的 CSS。** 八種類型乘兩個語軌。模板單檔自包含，那段共用區塊在十六份之間逐字一致，由同步腳本維護與校驗。逐字的意思是逐位元組——差一個字元就會被判為漂移。

**四十五個色彩 token，一個真相來源。** 全部收在 `references/tokens.json`，模板的 `:root` 與它比對，任何一份改錯一個色碼都會被檢查出來。

**背景四層。** 繪製基色 `#000000` → 暖色漏光以 `screen` 疊加 → 可選的中央沉暗層 → 顆粒以 `normal` 混合、永遠最上層。疊完的合成明度約 12.8。繪製下去的顏色與看到的顏色是兩件事，這一點在規格裡反覆強調過。

**顆粒是靜態材質。** 200×200 的灰階 PNG，固定種子產生，位元組層級可重現。疊加後的 luma 標準差約 7.4，規格容許 6 到 14。它不閃爍、不位移、不隨捲動變化。

**漏光依頁型分級。** 色相 18–30°，敘事型 24%/19%、結構型 15%/12%、閱讀型 10%/8%。核心錨定在畫面之外，畫面內只有衰減尾端。

**裝飾語彙四種。** 幾何細線與弧線、塵點、鏡像重影、邊緣編目微型字。弧線與斷續刮痕二選一：一個是構圖語彙，一個是損傷語彙，疊在一起會互相抵銷。

**排印由襯線主導。** `display` 64 → `h1` 44 → `h2` 30 → 正文 16px。標題與正文都走襯線，無襯線只承擔導覽、日期與序號。字型是自架的 Noto Serif TC，OFL 授權。

**內容先過契約。** 每種類型有一份 JSON Schema，規範該有哪些內容與各自的長度上限。稿子澆進模板之前先驗——會撐爆版面的字數在進版面之前就被擋下。

**背景層有八條像素驗收。** 顆粒強度、明度分布、色相、正文欄均勻度在原始碼裡看不出來，眼睛也不可靠。這八條對截圖取像素統計：中央須暗於邊緣、明度面積三帶、顆粒標準差、三通道無彩度、低頻殘差、色相分布、正文欄均勻度、跨截圖穩定度。

**兩種語氣模式。** 標準模式是預設。顯影模式罕用，把抽象宣示轉譯成可觀察的物理紀錄，必須明確指定才啟用。兩個模式共用同一套品質門檻，切換不放寬任何一條。

純螢幕交付。授權 MIT，字型 OFL。

## 鳴謝

架構的發想受 [Kami](https://github.com/tw93/kami) 啟發，承襲了把文件排版做成 AI 代理 skill 這個模組化的思路。視覺表達走的是另一套暗色類比語言：純黑基底、暖色漏光與膠片顆粒，替換了原本的淺色紙張質感。

謝謝 tw93 與 Kami 的開源工作。
