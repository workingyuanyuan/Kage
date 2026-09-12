# 製作與驗證

依任務查閱「文件製作」、「驗證」或「模板庫維護」。以下命令從 Kage 專案根目錄執行，成品與稿件參數可使用絕對路徑。

## 文件製作

複製適用模板到交付目錄，依 `{{...}}` 提示填寫 HTML，按真實內容增減區塊。確認字型、顆粒與圖片的相對路徑：模板引用的 `../fonts/`、`../img/` 在搬移後需要配合交付位置調整或一併攜帶資產。

八份 [schemas/](schemas/) JSON Schema 描述既有模板的欄位形狀與容量。保留該結構、整理長稿或需要程式化檢查時，可先準備 JSON 並執行：

```bash
node scripts/kage.mjs content <type> <稿件.json>
```

`type` 對應模板名稱，例如 `letter` 或 `slides`，中英共用。驗證器以 Unicode 字元計算 `minLength` / `maxLength`；Schema 註解中的總字數目標並未由工具檢查，也不代表英文詞數。

Schema 中的固定欄位與項目數適用於該模板輪廓。使用者指定不同結構時，直接調整成品並檢查其內容與實際版面；只改文字的小任務可直接編輯 HTML。JSON 與模板提示沒有自動映射，目前填製由代理完成。

## 驗證

依實際改動選擇檢查，修正受影響的內容與排版，通過後完成交付。

| 情境 | 檢查 |
|---|---|
| 新建或填製文件 | `node scripts/kage.mjs placeholders <完成的檔案>`，檢查成品內容與資產載入 |
| 使用既有 Schema 整理稿件 | `node scripts/kage.mjs content <type> <稿件.json>` |
| 新版面、CSS、圖片尺寸、可能改變換行的內容 | 檢視受影響畫面；新文件通常檢查 1280px 與 375px |
| 簡報導覽或互動元件 | 檢查受影響操作、鍵盤使用與必要的動效降級 |
| 背景材質、色彩或頁型分級改動 | 背景截圖與像素檢查，見下方 |
| 共用模板、token 或 Schema 維護 | `node scripts/kage.mjs check` |

`placeholders` 會將殘留 `{{...}}` 判為失敗，並列出資料缺口；模板庫本身刻意保留提示，只對成品執行。缺口不會造成工具失敗，仍須判斷其對交付的影響。內容檢查確認欄位與容量，最終仍需核對真實性、完整性與可讀性。

### 畫面檢查

可使用可用的瀏覽器工具，或內建截圖命令：

```bash
node scripts/kage.mjs shot <完成的檔案> --widths 1280,375
node scripts/kage.mjs shot <完成的檔案> --frames
```

`shot` 尋找 Chrome 或 Edge；必要時以 `KAGE_CHROME` 指向瀏覽器執行檔。截圖寫在輸入 HTML 旁，重跑會覆寫同名圖檔；驗證副本放在獨立輸出目錄並確保資產可載入。

實際查看輸出的畫面，注意裁切、文字重疊、水平溢出與資產缺失。長文與簡報可用 `--frames` 檢視各畫面；背景錨定以單一視窗為參考。瀏覽器不可用時先完成可執行的檢查，並在交付中說明受影響的視覺驗證限制。

### 背景檢查

```bash
node scripts/kage.mjs shot <完成的檔案> --bg-only --widths 1280,375
node scripts/kage.mjs bg <背景截圖.png…> --tier c
```

按 [material.md](material.md)「4. 頁型分級」選擇 `--tier a|b|c`；預設是 C。八項像素檢查的定義見該文件「5. 驗收」。輸入必須來自 `--bg-only`，前景文字與紙張表面會污染背景統計。

## 模板庫維護

成品的局部樣式調整在成品內完成。修改共用設計時才同步規格與模板庫。

共用 CSS 的 `BASE` 以 [one-pager.html](../assets/templates/one-pager.html) 為來源，其餘模板由工具同步：

```bash
node scripts/kage.mjs sync --write
node scripts/kage.mjs check
```

`sync --write` 只傳播 BASE；類型專用 CSS 留在各自模板，相關中英版本應一致。根目錄官網也參與 BASE 比對，但由 `node scripts/build-site.mjs` 生成；當共用 BASE 改變並影響官網時再重建。

`check` 檢查 BASE、色彩 token、模板 lint 與 Schema 結構。更新規格時核對相應實作；背景改動依上節量測，類型版面改動檢視該類型的代表畫面。
