# 工具圖鑑（Tool Gallery）設計文件

**日期：** 2026-05-05
**目標專案：** d:/GitHub/ai-workshop（行政與財務流程 AI 自動化｜互動教學工作坊）
**狀態：** 待實作（design 已使用者確認）
**前置依賴：** 已完成的講師卡片功能（`scrape-youtube-channel.mjs` + `instructor-data.js`）

---

## 1. 背景與目標

### 1.1 課程涉及的軟體

4 天課程橫跨多個 AI 工具，學員每次到新單元就要重新理解「這次又是什麼工具」。盤點如下：

| 工具 | Day 1 | Day 2 | Day 3 | Day 4 |
|---|---|---|---|---|
| Gemini App | ✓ | ✓ | ✓ |  |
| NotebookLM | ✓ |  | ✓ |  |
| Antigravity | ✓ |  |  | ✓ |
| Codex / ChatGPT | ✓ |  |  | ✓ |
| Flow（Veo 影片，已合併原 Whisk 圖像功能） |  | ✓ |  |  |
| Google Labs |  |  |  | ✓ |

> **2026-05-05 更新**：原 Whisk 已合併至 Flow（含原圖像合成能力），故工具圖鑑共 6 個工具（非原規劃 7 個）。

### 1.2 痛點

- 學員不易快速辨認「這個工具長什麼樣」。
- 跨天重複出現的工具（Gemini）若每單元都重複介紹，會冗餘。
- 各工具官方連結散在課程文字中，不便集中跳轉。

### 1.3 目標

新增**集中式「工具圖鑑」章節**，讓學員一處看完所有會用到的工具：截圖 + 一句定位 + 適用日標籤 + 官方連結。

### 1.4 非目標（YAGNI）

- ❌ **不抓登入後的操作畫面**（Google/OpenAI 反爬，無法可靠自動化）
- ❌ **不做步驟流程截圖**（屬於後續 Phase 2，本次只做 Phase 1 的「介紹層」）
- ❌ **不抓 Nano Banana / Canvas 獨立頁**（Gemini 子功能，描述合併到 Gemini 卡片）

---

## 2. 整體架構

```
┌──────────────────────────────────────────────────────────────┐
│  scripts/scrape-tools.mjs                                    │
│  └── 用 Playwright headless Chromium 跑 7 個公開頁 URL         │
│      └── 統一 viewport 1280×800、locale zh-TW                  │
│      └── 等 networkidle、關 cookie/登入彈窗、截 1280×720         │
│                                                              │
│  產出：                                                       │
│  ├── data/tools/<id>.png      (每工具一張)                     │
│  ├── data/tools.json          (結構化資料給其他程式用)           │
│  └── tools-data.js            (window.TOOLS = [...])         │
│                                                              │
│  index.html                                                  │
│  ├── <script src="tools-data.js">  (與 instructor-data.js 同層) │
│  ├── 新章節 #toolbox                                          │
│  │   └── renderToolbox() 渲染 7 張卡片 + Day 篩選             │
│  └── sidebar 新增 'T' 項目                                    │
└──────────────────────────────────────────────────────────────┘
```

延續第一波講師卡片的設計模式（雙產出 JSON+JS、`<script src>` 載入、可在 `file://` 雙擊執行）。

---

## 3. 資料結構

### 3.1 `tools-data.js`

```js
window.TOOLS = [
  {
    id: 'gemini',
    name: 'Gemini',
    fullName: 'Gemini App',
    tagline: '通用對話與內容生成。含 Nano Banana（生圖）、Canvas（生 .pptx 投影片）。',
    url: 'https://gemini.google.com/?hl=zh-TW',
    screenshot: 'data/tools/gemini.png',
    days: [1, 2, 3],
    scrapeStatus: 'ok',  // 'ok' | 'failed'
    scrapeError: null,
    scrapedAt: '2026-05-05T10:00:00Z'
  },
  // ... 其餘 6 個
];
```

### 3.2 完整工具清單（硬編於腳本）

| id | name | url | days | tagline (中文一句話) |
|---|---|---|---|---|
| `gemini` | Gemini | https://gemini.google.com/?hl=zh-TW | [1,2,3] | 通用對話與內容生成。含 Nano Banana（生圖）、Canvas（生 .pptx）。 |
| `notebooklm` | NotebookLM | https://notebooklm.google.com | [1,3] | 以你提供的資料為唯一來源的 AI 筆記本，附引用時間戳。 |
| `antigravity` | Antigravity | https://antigravity.google | [1,4] | Google Labs 桌面型 AI 代理（IDE-like），可執行 Skill。 |
| `codex` | Codex | https://openai.com/codex | [1,4] | OpenAI 偏程式碼與腳本生成的 CLI 工具，Day 4 用於 Skill 開發輔助。 |
| `flow` | Flow | https://labs.google/flow | [2] | Google AI 影片工具，內建 Nano Banana（生圖）+ Veo（生影片）。原 Whisk 圖像合成功能已整合於此。 |
| `labs` | Google Labs | https://labs.google | [4] | Google 實驗性 AI 產品孵化中心。 |

> 註：原計畫含 Whisk（圖像合成實驗），2026-05-05 時 Whisk 已併入 Flow，故移除獨立卡片，能力併入 Flow 的 tagline。

### 3.3 為何 `tagline` 與 `days` 不從網站抓

兩者都是**課程脈絡資料**而非工具自身公開資訊。Playwright 只負責 (1) 確認 URL 可開、(2) 取得截圖。其餘欄位由腳本內常數提供。

---

## 4. Playwright 腳本行為

### 4.1 流程

```
for each tool in TOOLS_LIST:
  1. page.goto(url) with waitUntil 'networkidle'
  2. dismissCommonPopups(page)
     - cookies 同意（"全部接受" / "Reject all" 等多語）
     - Google 登入彈窗 close button
     - generic dialog X 按鈕
  3. page.waitForTimeout(1500)  // 等動畫
  4. page.screenshot({ path: data/tools/{id}.png, clip: 1280×720 })
  5. push 結果到 result[] (status ok / failed)
output:
  - 寫 data/tools.json
  - 寫 tools-data.js (覆寫 window.TOOLS = ...)
  - console 印成功/失敗摘要
```

### 4.2 錯誤處理策略

- **單一工具失敗不中斷**：try/catch 包單支 scrape，失敗就 log + 標 `scrapeStatus: 'failed'`，繼續下一個。
- **失敗截圖 fallback**：若主流程 screenshot 失敗，嘗試 `fullPage: false` 重截一次。仍失敗則 `screenshot: null`。
- **HTML 渲染容錯**：渲染端遇到 `screenshot: null` 顯示文字 placeholder（不破畫面）。

### 4.3 反爬與穩定性

- viewport `1280×800`（瀏覽器視窗大小，含瀏覽器 chrome 之外的內容區）
- screenshot `clip: { x:0, y:0, width:1280, height:720 }`（截上半 16:9，避免抓到 footer）
- userAgent 用真實 Chrome 字串
- locale `zh-TW`
- Google URL 加 `?hl=zh-TW` 強制中文
- 不模擬登入、不點操作元素，純抓「打開頁面當下」的畫面

---

## 5. HTML / CSS 整合

### 5.1 渲染位置

新增 section `#toolbox`，插在 `renderMaterialsOverview()` 與 `renderQuiz()` 之間。

### 5.2 結構

```html
<section id="toolbox" class="chapter">
  <header>
    <span class="eyebrow">工具圖鑑</span>
    <h2>4 天課程會用到的 7 個 AI 工具</h2>
    <div class="lead">點擊任一張卡片開啟官方頁面；用上方 Day 篩選快速找到當日工具。</div>
  </header>

  <!-- Day 篩選 chip -->
  <div class="toolbox-filters">
    <button class="chip active" data-day="all">全部</button>
    <button class="chip" data-day="1">Day 1</button>
    <button class="chip" data-day="2">Day 2</button>
    <button class="chip" data-day="3">Day 3</button>
    <button class="chip" data-day="4">Day 4</button>
  </div>

  <!-- 卡片網格 -->
  <div class="toolbox-grid">
    <!-- 對每個 tool 重複 -->
    <a class="tool-card" href="..." target="_blank" data-days="1 2 3">
      <img class="tool-screenshot" src="data/tools/gemini.png" alt="Gemini" loading="lazy">
      <div class="tool-card-body">
        <div class="tool-name">Gemini</div>
        <div class="tool-tagline">...</div>
        <div class="tool-days">
          <span class="tool-day-tag">Day 1</span>
          <span class="tool-day-tag">Day 2</span>
          <span class="tool-day-tag">Day 3</span>
        </div>
      </div>
    </a>
  </div>
</section>
```

### 5.3 CSS

- 走既有 CSS 變數：`--accent`、`--surface`、`--border`、`--r-md`、`--r-lg`
- 暗色模式自動跟隨（變數已支援）
- Grid：`grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px;`
- 卡片 hover：`transform: translateY(-2px); border-color: var(--accent);`
- 截圖比例：`aspect-ratio: 16/9; object-fit: cover; object-position: top;`

### 5.4 Day 篩選互動

純 vanilla JS，不引入框架：
- 點 chip → 切換 `active` class、設 `current = day`
- 對所有 `.tool-card` 檢查 `data-days` 是否包含 `current`，不包含則 `display: none`
- `current === 'all'` 時全部顯示

### 5.5 Sidebar 整合

在 `index.html` 的 sidebar `pages` 陣列新增：
```js
{ id: 'toolbox', num: 'T', label: '工具圖鑑', group: '工具' }
```

排序位置：在 `materials-overview` 之後、`quiz` 之前（與設計圖一致）。

---

## 6. 檔案異動清單

| 檔案 | 動作 | 備註 |
|---|---|---|
| `scripts/scrape-tools.mjs` | 新增 | Playwright 主腳本 |
| `data/tools/*.png` | 新增 | 7 張截圖（自動產生） |
| `data/tools.json` | 新增 | 結構化資料（自動產生） |
| `tools-data.js` | 新增 | 注入用 JS（自動產生） |
| `index.html` | 編輯 | 加 `<script src>`、CSS、`renderToolbox()`、sidebar 條目 |
| `package.json` | 編輯 | 加一條 `npm run scrape:tools` |

---

## 7. 測試 / 驗收標準

### 7.1 自動驗證

擴充既有的 `scripts/verify-instructor-card.mjs`（或新建 `verify-toolbox.mjs`）：
- 開啟 `http://localhost:8765/`
- 等 `.toolbox-grid` 渲染
- 驗證有 7 張 `.tool-card`
- 驗證每張卡片有非空 `.tool-name`、`.tool-tagline`
- 點 chip "Day 2" → 驗證只剩 Flow + Whisk + Gemini 可見
- 截圖 `data/verify-toolbox.png` 供人眼確認

### 7.2 人眼驗收

- 7 張卡片視覺一致（圖比例對齊、文字長度差異不破版）
- 暗色模式切換正常
- 880px 以下單欄堆疊
- Sidebar 新項目可平滑捲動到 #toolbox

---

## 8. 重跑與維護

```bash
npm run scrape:tools     # 重新擷取 7 個工具公開頁截圖 + 更新 tools-data.js
npm run serve            # 預覽
```

未來新增工具：在 `scripts/scrape-tools.mjs` 的 `TOOLS_LIST` 陣列新增一筆即可，HTML 不用改。

---

## 9. 風險與已知限制

| 風險 | 處理方式 |
|---|---|
| Google 偵測 Playwright 直接擋頁 | 用真實 Chrome UA + `webdriver` 屬性處理；失敗則該工具截圖 null，卡片顯示文字 placeholder |
| 公開頁改版讓截圖看起來突兀 | 重跑 `scrape:tools` 即可更新 |
| Antigravity 仍在 Labs 階段，URL 可能變動 | URL 集中在 TOOLS_LIST 一處，改動成本低 |
| 圖片下載延遲（7 張 PNG，約 1-3 MB） | 使用 `loading="lazy"` 與 `aspect-ratio` 防止 layout shift |
