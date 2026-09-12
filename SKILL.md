---
name: kage
description: '以純黑、暖色漏光、膠片顆粒與襯線排印製作 HTML 文件與靜態落地頁。用於指定 Kage 或暗色類比風格的排版，以及修改既有 Kage 成品。'
---

# 影 · kage

Kage 是螢幕閱讀用的暗色類比設計語言，提供八種文件的繁中與英文 HTML 模板。

## 任務範圍

依使用者的用途、素材與既有文件選擇類型、語言和篇幅。保留指定的交付格式、內容與授權範圍；原生 Office、PDF、淺色設計或應用程式功能需要相應的交付方式，不能只用 Kage HTML 取代。

可合理推斷的排版選擇直接處理。只有缺少會改變交付結果、且無法從現有資料判斷的資訊時才提問；其餘部分持續完成。

## 模板與參考

新文件從最接近的模板開始；既有成品直接編輯。模板的區塊與數量可依真實內容調整。

| 用途 | 繁中模板 | 內容指引 |
|---|---|---|
| 單頁方案、執行摘要 | [one-pager.html](assets/templates/one-pager.html) | [單頁方案](references/writing.md#one-pager) |
| 長篇報告、提案 | [long-doc.html](assets/templates/long-doc.html) | [長篇報告](references/writing.md#long-doc) |
| 正式書信 | [letter.html](assets/templates/letter.html) | [書信](references/writing.md#letter) |
| 作品集、案例研究 | [portfolio.html](assets/templates/portfolio.html) | [作品集](references/writing.md#portfolio) |
| 版本更新日誌 | [changelog.html](assets/templates/changelog.html) | [更新日誌](references/writing.md#changelog) |
| 個股研究、投資備忘 | [equity-report.html](assets/templates/equity-report.html) | [個股研報](references/writing.md#equity-report) |
| 橫向投影片 | [slides.html](assets/templates/slides.html) | [簡報](references/writing.md#slides) |
| 靜態產品落地頁 | [landing-page.html](assets/templates/landing-page.html) | [落地頁](references/writing.md#landing-page) |

英文選同目錄的 `-en.html` 模板。`<html lang>` 會切換行高與行寬：繁中為 `zh-Hant`，英文為 `en`。

按本次工作查閱相關段落：

- 撰寫或實質改稿：讀 [writing.md](references/writing.md) 的來源、語氣與對應類型。顯影語氣由使用者指定時才採用。
- 調整排印、版面或元件：讀 [design.md](references/design.md) 的對應章節；缺圖且需保留版位時見「3.4 圖片框架」。
- 修改漏光、顆粒、表面或色彩：讀 [material.md](references/material.md)，色彩定義在 [tokens.json](references/tokens.json)。
- 建立文件、選擇驗證命令或維護模板庫：讀 [production.md](references/production.md) 的相應段落。
- 審查稿件品質：按問題查閱 [anti-patterns.md](references/anti-patterns.md)。

## 設計與內容邊界

保留 Kage 的純黑繪製基底、邊緣暖色漏光、靜態顆粒與襯線主導排印。模板已包含頁型分級；閱讀型正文須置中並受 `--measure` 限制。橘棕文字的對比限制見 material.md「2.4 對比與可存取性」。

模板的 `{{...}}` 是人工填製提示。只填入有依據的內容；按需求移除不適用區塊。必要資料尚缺時，以單一文字節點標示 `[需要資料：說明]`，說明保持在 80 字元內，讓現有檢查工具能辨識。

## 完成與輸出

持續完成交付範圍內的內容、排版、適用檢查與發現問題的修正。完成代表交付檔案可開啟、必要資產可載入、內容符合需求，且受影響的畫面或互動已檢查。需要使用者資料、授權或不可用能力才能繼續時，交付可用部分並清楚指出影響結果的缺口。

回覆與受眾文案只呈現所需的最終內容及必要行動。規則、排除條件與製作限制留作內部控制；避免敘述未變動或未執行事項、修訂歷史、未要求的替代方案、對比式套話、自造複合標籤與收尾總結。使用平實、直接的語言。

交付回覆提供檔案連結、與結果相關的驗證摘要，以及需要處理的資料缺口或阻礙。驗證結論須與實際執行範圍一致。
