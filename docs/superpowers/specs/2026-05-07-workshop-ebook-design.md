# 工作坊電子書 — 設計文件

- **建立日期**：2026-05-07
- **作者**：Kevin Tsai（kevintsai1202）
- **狀態**：Draft（待實作）
- **相關 repo**：[kevintsai1202/ai-workshop](https://github.com/kevintsai1202/ai-workshop)

---

## 1. 目標

把現有的「行政與財務流程 AI 自動化」4 天工作坊互動教學網頁與課程包，**自動化打包**成一份單一 PDF 電子書，學員可離線閱讀、列印發放。內容須與 `course-data.js`（網頁 single source of truth）保持同步——課綱改一次，電子書重 build 即可。

## 2. 鎖定的設計取捨

| 主題 | 決定 | 理由 |
|---|---|---|
| 輸出格式 | **單一 PDF** | 列印友善、所有裝置可開、可重用既有 pandoc + Edge headless 工具鏈 |
| 互動內容 | 改寫為靜態：任務 → ☐ 紙本勾選；提示詞 → monospace 區塊；測驗 → 紙本作答區+解答附錄 | PDF 無互動能力 |
| 講師影片 | 標題 + 網址 + QR Code | 紙本上 QR Code 是跳回 YouTube 最快的橋樑 |
| 工具圖鑑 | 縮圖 + QR Code 跳官網 | 同上 |
| 附錄素材策略 | **混合**：11 份輔助素材（.md/.csv/.yaml）全文嵌入；8 份規章 PDF 列清單 + QR Code | 前者短易讀；後者排版精細，轉文字會丟失版面 |
| 結訓測驗 | 題目放第 5 章紙本作答區，**解答放附錄 D** | 學員可先做題、後對答 |
| 附錄 C QR Code base URL | `https://raw.githubusercontent.com/kevintsai1202/ai-workshop/main/完整課程包/教學素材/pdf/<檔名>.pdf` | repo 公開、學員掃了直接拿 PDF |
| 建構流程 | `scripts/build-ebook.mjs`：讀 `course-data.js` + 4 份 .md → 組合 master markdown → 沿用 pandoc + Edge headless 印 PDF | 重用既有工具；資料源仍是 course-data.js |

## 3. 整體架構

### 資料流

```
course-data.js (window.COURSE)         ┐
完整課程包/課程總覽.md                  │
完整課程包/共用案例設定.md              │   build-ebook.mjs
完整課程包/Day{1..4}/課程內容.md        │   ─────────────►   dist/工作坊電子書.md
完整課程包/教學素材/*.md/.csv/.yaml     │   (組稿 + QR Code)
8 份規章類 PDF（檔名）                  │
instructor-data.js / tools-data.js      ┘
                                                ↓
                                          pandoc → HTML
                                                ↓
                                          Edge headless --print-to-pdf
                                                ↓
                                          dist/工作坊電子書.pdf
```

### 模組分解

`scripts/build-ebook.mjs` 負責 CLI 與主流程；純函式 `compose*()` 抽到 `scripts/lib/compose-ebook.mjs`；PDF 渲染抽到 `scripts/lib/render-pdf.mjs`（給 ebook 與既有 build-pdf.ps1 共用）。

| 區塊 | 職責 | 介面 |
|---|---|---|
| `loadSources()` | 用 `vm` 模組執行 course-data.js / instructor-data.js / tools-data.js；fs 讀 4 份 .md | `{ COURSE, INSTRUCTOR, TOOLS, dayContents, overview, sharedCase }` |
| `composeCover(s)` | 封面 markdown | `string` |
| `composeOverview(s)` | 第 0 章課程總覽 | `string` |
| `composeDay(day, dayContent)` | Day N 章節：先放 .0 學習目標 + 時程表 + 整份 `dayContent.md` 作為章節導論；接著遍歷 `day.units[]` 產 .1～.N（含 prompts、tasks ☐、unit 內素材引用） | `string` |
| `composeQuiz(quiz)` | 第 5 章結訓測驗（題目+空答案行，**不含答案**） | `string` |
| `composeAppendixA(materials)` | 附錄 A：素材總覽表 | `string` |
| `composeAppendixB(materials)` | 附錄 B：11 份輔助素材**全文嵌入** | `string` |
| `composeAppendixC(pdfMaterials)` | 附錄 C：8 份規章 PDF 索引 + QR Code | `string` |
| `composeAppendixD(quiz)` | 附錄 D：結訓測驗解答 | `string` |
| `composeAppendixE(tools)` | 附錄 E：工具圖鑑（截圖 base64 + QR Code） | `string` |
| `composeAppendixF(instructor)` | 附錄 F：講師熱門影片（標題+網址+QR Code） | `string` |
| `qrPng(text)` | `qrcode` 套件產 base64 PNG → `![](data:image/png;base64,...)` | 純函式 |
| `renderPdf({mdPath, cssPath, outPath})` | pandoc → HTML → Edge headless → PDF | 副作用：產出檔案 |

## 4. 全書章節結構

```
封面
目錄（pandoc 自動產生 TOC，深度 = 3）

第 0 章  課程總覽
  0.1 工作坊資訊（4 天課表、上課時間、地點）
  0.2 學習地圖
  0.3 共用案例設定（暖光咖啡 / 綠野選物）
  0.4 講師簡介（不含影片清單）

第 1 章  Day 1 — 產業趨勢與 AI 基礎入門
  1.0 學習目標 + 時程表
  1.1 ~ 1.N  各單元
        ├─ 學習要點（從 Day{n}/課程內容.md 對應段落）
        ├─ 提示詞範例（prompts[] → monospace 區塊）
        ├─ 任務清單（tasks[] → 每項 ☐ 留空）
        └─ 該單元素材引用（materials[] → 標明附錄編號）

第 2 章  Day 2 — AI 多媒體內容製作
第 3 章  Day 3 — 行政文件與財務資料整理
第 4 章  Day 4 — AI 代理協作與成果展示
第 5 章  結訓測驗（N 題紙本作答區，無答案；N = COURSE.quiz.length）

附錄 A  教學素材總覽（一張總表）
附錄 B  輔助素材全文（11 份）
        B.1 品牌調性指南、B.2 老闆口語稿、B.3 3段爛提示詞、
        B.4 會議錄音逐字稿範本、B.5 亂格式請購單(csv → 表格)、
        B.6 雜亂客訴10則、B.7 發票自動整理 Skill 範本(yaml → code block)、
        B.8~B.10 課堂實作素材_Day1/2/3、B.11 課程輔助文件
附錄 C  規章/SOP/手冊 PDF 索引（8 份；每份一頁含 QR Code）
        C.1 綠野選物_員工差勤與休假管理辦法
        C.2 綠野選物_新進員工教育訓練手冊
        C.3 綠野選物_新品上架公告作業辦法
        C.4 暖光咖啡_FAQ官方版
        C.5 暖光咖啡_商品退換貨政策
        C.6 暖光咖啡_客訴處理SOP
        C.7 暖光咖啡_食材進貨與庫存管理辦法
        C.8 公司費用報支管理辦法
附錄 D  結訓測驗解答（每題：正解 + 解析 + 對應章節編號）
附錄 E  工具圖鑑（6 工具：縮圖 + 一句介紹 + 官網 QR Code）
附錄 F  講師熱門 YouTube 影片（INSTRUCTOR.videos 前 N 部 + QR Code；N 預設 8，由 build-ebook.mjs 常數 INSTRUCTOR_VIDEO_COUNT 控制）

封底（聯絡資訊、工作坊網頁 QR Code、版次）
```

### 關鍵 markdown 慣例

| 元素 | markdown 表示 | 理由 |
|---|---|---|
| 任務勾選 | `☐ 任務內容`（U+2610） | pandoc → HTML → Edge headless 對 `<input type="checkbox">` 列印不一定渲染；用 Unicode 字元保險 |
| 提示詞 | ` ```text\n...\n``` ` | monospace + 邊框；可在 PDF 中選取複製 |
| .csv 素材 | 解析後產 markdown 表格 | pandoc 對 markdown 表格支援良好 |
| .yaml 素材 | ` ```yaml\n...\n``` ` | 保留縮排與語法高亮 |
| 章節分頁 | 由 `style-ebook.css` 的 `h1 { page-break-before: always }` 控制 | 不在 markdown 寫死 |

### 預估頁數：**約 168 頁**

## 5. 建構流程細節

### 檔案佈局

```
scripts/
├── build-ebook.mjs           ← 主腳本：CLI、主流程
└── lib/
    ├── render-pdf.mjs        ← 抽出 build-pdf.ps1 核心邏輯
    └── compose-ebook.mjs     ← 純函式 compose*() 集合

完整課程包/教學素材/_build/
├── style.css                 ← 既有（單份素材 PDF 用）
├── style-ebook.css           ← 新增（電子書專用）
└── build-pdf.ps1             ← 既有（不動）

dist/                         ← 新增 .gitignore
├── 工作坊電子書.md
└── 工作坊電子書.pdf
```

### npm script

```json
{
  "scripts": {
    "build:ebook": "node scripts/build-ebook.mjs"
  }
}
```

### CLI flags

- `--md-only`：只產 master markdown（debug 用）
- `--output <path>`：自訂輸出路徑（預設 `dist/工作坊電子書.pdf`）
- `--keep-html`：保留中間 HTML（debug 用）

### 主流程

1. 解析 CLI flags
2. `loadSources()` — 讀資料源；缺欄位即拋具名錯誤
3. 各 `compose*()` 產出 markdown 字串
4. 串接 → `dist/工作坊電子書.md`
5. 若 `--md-only` 結束
6. `renderPdf()` — pandoc → HTML → Edge headless → PDF
7. 印出最終檔案大小

### style-ebook.css 重點

```css
body { font-family: "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif; }
h1 { page-break-before: always; font-size: 24pt; border-bottom: 2px solid #4f7cdb; }
h1.cover, h1.toc { page-break-before: avoid; }
h2 { font-size: 18pt; color: #2c4fa5; margin-top: 28px; }
pre, code { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
            background: #f5f7fb; border-left: 3px solid #4f7cdb;
            padding: 12px 14px; font-size: 10.5pt; }
.qr { width: 120px; height: 120px; }
.tool-shot { max-width: 80%; max-height: 480px; border: 1px solid #ccc; }
@page { margin: 18mm 16mm; }
@page :first { margin: 0; }
```

## 6. 錯誤處理

| 錯誤類型 | 處理策略 |
|---|---|
| `course-data.js` 缺欄位 | 拋具名錯誤：`Missing field: COURSE.day1.units[0].prompts` |
| 課程內容 .md 檔不存在 | 拋錯含預期路徑 |
| pandoc 不在 PATH | 拋錯 + 提示 `winget install pandoc` |
| Edge headless 找不到 | fallback 嘗試 Chrome；都失敗才拋錯 |
| QR Code 產生失敗 | 該位置 fallback 為純文字 URL，不擋 build |
| 工具截圖 base64 缺失（tools-data.js 未跑） | 該工具的圖位置改為「[未抓取截圖，請執行 npm run scrape:tools]」 |

## 7. 測試策略（YAGNI）

- 不寫 unit test：輸出是 PDF（diff 困難），且為一次性工具。
- **Smoke test**：跑 `npm run build:ebook -- --md-only` 後人工檢查 markdown；最終 PDF 開啟驗證封面、目錄、章節分頁、附錄 QR Code 可掃。
- 後續若 `compose*()` 出 bug 再針對純函式補 snapshot test（input → markdown 字串）。

## 8. 與既有功能的相容性

| 既有元件 | 是否影響 |
|---|---|
| `index.html` | 不動 |
| `course-data.js` | 不動（read-only 來源） |
| `instructor-data.js` / `tools-data.js` | 不動（read-only 來源） |
| `完整課程包/教學素材/_build/build-pdf.ps1` | 不動；其核心邏輯抽出到 `scripts/lib/render-pdf.mjs` 後可選擇性回頭重構（不在本次 scope） |
| `完整課程包/教學素材/_build/style.css` | 不動；新增獨立 `style-ebook.css` |

## 9. 新增依賴

- `qrcode`（npm，純 JS、無原生依賴）：產 base64 PNG QR Code

## 10. 不在本次 scope（YAGNI）

- EPUB 輸出
- 多語言版本
- 自動化每次 commit 重 build（CI）
- 與工作坊網頁的雙向連結（網頁端加「下載電子書」按鈕）
- 將既有 `build-pdf.ps1` 改寫為 node 腳本（重構是另一個任務）
- 為 `compose*()` 寫 unit test

## 11. 後續實作步驟（將由 writing-plans 展開）

1. 安裝 `qrcode` 依賴
2. 建立 `scripts/lib/compose-ebook.mjs` 與 11 個 `compose*()` 純函式
3. 建立 `scripts/lib/render-pdf.mjs`（抽 pandoc + Edge headless 邏輯）
4. 建立 `scripts/build-ebook.mjs`（CLI + 主流程）
5. 建立 `完整課程包/教學素材/_build/style-ebook.css`
6. `package.json` 加 `build:ebook` script
7. `.gitignore` 加 `dist/`
8. 跑一次 `npm run build:ebook` 並人工 smoke test
9. 修正首版發現的問題（章節分頁、字型、QR Code 大小）
10. 更新 `README.md` 加上電子書建構指令
