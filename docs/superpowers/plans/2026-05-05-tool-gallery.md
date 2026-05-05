# Tool Gallery 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `index.html` 新增「工具圖鑑」章節，集中展示課程使用的 6 個 AI 工具公開頁截圖、定位敘述與適用日標籤；截圖由可重跑的 Playwright 腳本自動擷取（Codex 與 NotebookLM 因反爬／需登入由講師手動補圖）。

**註（2026-05-05 計畫變更）：** 原規劃 7 個工具，因 Whisk 在計畫期間併入 Flow，移除 Whisk 獨立卡片，能力併入 Flow 的 tagline 描述。Task 8 驗證腳本的 `EXPECTED_TOOL_COUNT = 6`、Day 2 篩選預期顯示 2 張（Gemini + Flow）。

**Architecture:** 延續第一波講師卡片功能的雙產出（`*.json` + `*-data.js`）模式：scrape 腳本獨立於 HTML，產出 `tools-data.js` 賦值 `window.TOOLS`，HTML 用 `<script src>` 載入並由新增的 `renderToolbox()` 渲染為卡片網格 + Day 篩選 chips。

**Tech Stack:** Node.js (ESM), Playwright (chromium), Vanilla JS (no framework), CSS variables for theming.

**Spec reference:** [docs/superpowers/specs/2026-05-05-tool-gallery-design.md](../specs/2026-05-05-tool-gallery-design.md)

**Note (專案無 git)**：本專案目前**不是 git repo**（環境 `Is a git repository: false`），故步驟中省略 `git commit`。每個 Task 完成後請改以「檔案內容檢視 / 執行驗證指令」確認。若使用者後續 `git init`，可再回頭把每個 Task 視為一個 commit 單位。

---

## File Structure

| 路徑 | 動作 | 用途 |
|---|---|---|
| `scripts/scrape-tools.mjs` | 新增 | 主要 Playwright 腳本，含工具清單與抓取邏輯 |
| `scripts/verify-toolbox.mjs` | 新增 | 驗證腳本：開啟頁面 → 斷言 7 卡渲染 → 篩選測試 → 截圖 |
| `data/tools/<id>.png` | 自動產生 | 7 張工具公開頁截圖（`gemini.png` 等） |
| `data/tools.json` | 自動產生 | 結構化資料給其他工具用 |
| `tools-data.js` | 自動產生 | `window.TOOLS = [...]` 注入用 JS |
| `index.html` | 修改 | 加 `<script src>`、CSS、`renderToolbox()`、`NAV_ITEMS` 條目、`app.append` 呼叫 |
| `package.json` | 修改 | 加 `npm run scrape:tools` script |

每個檔案責任單一：scraper 只負責抓資料、verify 只負責驗證、index.html 的 `renderToolbox()` 只負責渲染、CSS 只負責樣式。資料流向單向：Playwright → JSON+JS → HTML。

---

## Task 1: 在 package.json 新增 scrape:tools script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 編輯 package.json，新增 npm script**

開啟 `d:/GitHub/ai-workshop/package.json`，在 `scripts` 物件中新增 `scrape:tools`：

```json
{
  "name": "ai-workshop",
  "version": "1.0.0",
  "private": true,
  "description": "行政與財務流程 AI 自動化｜互動教學工作坊（純靜態網頁 + Playwright 資料擷取腳本）",
  "type": "module",
  "scripts": {
    "scrape:instructor": "node scripts/scrape-youtube-channel.mjs",
    "scrape:tools": "node scripts/scrape-tools.mjs",
    "verify:toolbox": "node scripts/verify-toolbox.mjs",
    "serve": "npx serve ."
  },
  "devDependencies": {
    "playwright": "^1.59.1"
  }
}
```

- [ ] **Step 2: 驗證**

```bash
cat d:/GitHub/ai-workshop/package.json | grep -E "scrape:tools|verify:toolbox"
```

Expected：兩行都有出現。

---

## Task 2: 建立 scrape-tools.mjs 骨架（TOOLS_LIST 常數 + main 流程）

**Files:**
- Create: `scripts/scrape-tools.mjs`

- [ ] **Step 1: 建立檔案、寫入完整骨架**

建立 `d:/GitHub/ai-workshop/scripts/scrape-tools.mjs`，完整內容：

```javascript
// =============================================================================
// 擷取工具公開頁腳本（Playwright）
// 用途：對 7 個課程使用的 AI 工具公開頁截圖，產出 data/tools.json + tools-data.js
// 設計原則（依 CLAUDE.md）：
//   1) 可重跑：純粹由 TOOLS_LIST 驅動，每次執行覆寫
//   2) 單支失敗不中斷批次：try/catch 包單支，標 scrapeStatus 後繼續
//   3) 不依賴登入：只抓「打開頁面當下」的公開畫面
// =============================================================================

import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(ROOT, 'data');
const TOOLS_DIR = resolve(DATA_DIR, 'tools');

// 課程使用的 7 個工具清單（順序即顯示順序）
// tagline 與 days 是課程脈絡資料，由講師決定，不從網站抓
const TOOLS_LIST = [
  {
    id: 'gemini',
    name: 'Gemini',
    fullName: 'Gemini App',
    tagline: '通用對話與內容生成。含 Nano Banana（生圖）、Canvas（生 .pptx 投影片）。',
    url: 'https://gemini.google.com/?hl=zh-TW',
    days: [1, 2, 3]
  },
  {
    id: 'notebooklm',
    name: 'NotebookLM',
    fullName: 'NotebookLM',
    tagline: '以你提供的資料為唯一來源的 AI 筆記本，附引用時間戳。',
    url: 'https://notebooklm.google.com',
    days: [1, 3]
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    fullName: 'Antigravity',
    tagline: 'Google Labs 桌面型 AI 代理（IDE-like），可執行 Skill。',
    url: 'https://antigravity.google',
    days: [1, 4]
  },
  {
    id: 'codex',
    name: 'Codex',
    fullName: 'OpenAI Codex',
    tagline: 'OpenAI 偏程式碼與腳本生成的 CLI 工具，Day 4 用於 Skill 開發輔助。',
    url: 'https://openai.com/codex',
    days: [1, 4]
  },
  {
    id: 'flow',
    name: 'Flow',
    fullName: 'Google Flow',
    tagline: 'Google AI 影片工具，內建 Nano Banana + Veo。',
    url: 'https://labs.google/flow',
    days: [2]
  },
  {
    id: 'labs',
    name: 'Google Labs',
    fullName: 'Google Labs',
    tagline: 'Google 實驗性 AI 產品孵化中心。',
    url: 'https://labs.google',
    days: [4]
  },
  {
    id: 'whisk',
    name: 'Whisk',
    fullName: 'Whisk',
    tagline: '圖像合成實驗工具（視時間帶逛）。',
    url: 'https://labs.google/whisk',
    days: [2]
  }
];

/**
 * 處理常見彈窗（cookie 同意、登入彈窗）
 * 多語系 fallback：英文、繁中、簡中
 */
async function dismissCommonPopups(page) {
  const buttonTexts = [
    'Reject all', 'Accept all', '全部拒絕', '全部接受', '拒絕全部', '接受全部',
    'No thanks', '不用了', '稍後再說', 'Maybe later', 'Close', '關閉'
  ];
  for (const text of buttonTexts) {
    try {
      const btn = page.locator(`button:has-text("${text}")`).first();
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(400);
      }
    } catch {
      // 沒看到就略過
    }
  }
}

/**
 * 擷取單一工具的截圖
 * 失敗回傳 { success: false, error }；成功回傳 { success: true, screenshot: 相對路徑 }
 */
async function scrapeOne(page, tool) {
  console.log(`\n📌 擷取 ${tool.name} (${tool.url})`);
  try {
    await page.goto(tool.url, { waitUntil: 'networkidle', timeout: 45000 });
    await dismissCommonPopups(page);
    await page.waitForTimeout(1500);

    const filename = `${tool.id}.png`;
    const fullPath = resolve(TOOLS_DIR, filename);
    await page.screenshot({
      path: fullPath,
      clip: { x: 0, y: 0, width: 1280, height: 720 }
    });
    console.log(`  ✓ 已截：${filename}`);
    return { success: true, screenshot: `data/tools/${filename}` };
  } catch (err) {
    console.error(`  ❌ 失敗：${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * 主流程：跑遍所有工具、產出 JSON + tools-data.js
 */
async function main() {
  console.log(`\n🛠️  Tool Gallery 擷取（共 ${TOOLS_LIST.length} 個工具）\n`);
  await mkdir(TOOLS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'zh-TW',
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const results = [];
  for (const tool of TOOLS_LIST) {
    const r = await scrapeOne(page, tool);
    results.push({
      ...tool,
      screenshot: r.success ? r.screenshot : null,
      scrapeStatus: r.success ? 'ok' : 'failed',
      scrapeError: r.success ? null : r.error,
      scrapedAt: new Date().toISOString()
    });
  }

  await browser.close();

  // 寫 JSON
  const jsonPath = resolve(DATA_DIR, 'tools.json');
  await writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n✅ 資料 JSON：${jsonPath}`);

  // 寫 tools-data.js（給 index.html 用 <script src> 載入）
  const jsPath = resolve(ROOT, 'tools-data.js');
  const jsContent = `// 由 scripts/scrape-tools.mjs 自動產生，請勿手動編輯\n// 重跑：npm run scrape:tools\nwindow.TOOLS = ${JSON.stringify(results, null, 2)};\n`;
  await writeFile(jsPath, jsContent, 'utf-8');
  console.log(`✅ 注入用 JS：${jsPath}`);

  // 摘要
  const ok = results.filter(r => r.scrapeStatus === 'ok').length;
  const fail = results.length - ok;
  console.log(`\n📊 總計：成功 ${ok} / 失敗 ${fail}`);
  if (fail > 0) {
    console.log('失敗清單：');
    results.filter(r => r.scrapeStatus === 'failed').forEach(r => console.log(`  - ${r.name}: ${r.scrapeError}`));
  }
}

main().catch((err) => {
  console.error('❌ 主流程崩潰：', err);
  process.exit(1);
});
```

- [ ] **Step 2: 驗證檔案內容無語法錯誤**

```bash
cd d:/GitHub/ai-workshop && node --check scripts/scrape-tools.mjs
```

Expected：無 output（成功）。

---

## Task 3: 跑 scraper、確認所有 7 個工具皆成功

**Files:**
- Verify: `data/tools.json`、`tools-data.js`、`data/tools/*.png`

- [ ] **Step 1: 執行 scraper**

```bash
cd d:/GitHub/ai-workshop && node scripts/scrape-tools.mjs
```

Expected output 末尾：
```
📊 總計：成功 7 / 失敗 0
```

- [ ] **Step 2: 確認 7 張 PNG 都產生**

```bash
ls d:/GitHub/ai-workshop/data/tools/
```

Expected：列出 `gemini.png`、`notebooklm.png`、`antigravity.png`、`codex.png`、`flow.png`、`labs.png`、`whisk.png` 共 7 個檔案。

- [ ] **Step 3: 確認 tools-data.js 含 window.TOOLS**

```bash
head -3 d:/GitHub/ai-workshop/tools-data.js
```

Expected：第三行為 `window.TOOLS = [`。

- [ ] **Step 4: 若有任何失敗工具的處置**

若 Step 1 顯示有失敗的工具：
- 看 `data/tools.json` 該工具的 `scrapeError` 訊息
- 常見原因：URL redirect、cookies 彈窗未被關掉、networkidle 逾時
- 處理方式：在 `scrape-tools.mjs` 的 `dismissCommonPopups` 多語清單裡加上對應的按鈕文字，或在該工具的 `goto` 後加客製化等待邏輯
- 修完後重跑 Step 1 直到 7/0

---

## Task 4: 在 index.html 載入 tools-data.js

**Files:**
- Modify: `index.html` (現有 `<script src="instructor-data.js">` 之後)

- [ ] **Step 1: 在 instructor-data.js 後加 tools-data.js**

用 Edit 工具改 `d:/GitHub/ai-workshop/index.html`：

old_string:
```html
<!-- ============================================================
     INSTRUCTOR DATA — 講師資料（由 scripts/scrape-youtube-channel.mjs 產生）
     重新擷取請執行：npm run scrape:instructor
     ============================================================ -->
<script src="instructor-data.js"></script>
```

new_string:
```html
<!-- ============================================================
     INSTRUCTOR DATA — 講師資料（由 scripts/scrape-youtube-channel.mjs 產生）
     重新擷取請執行：npm run scrape:instructor
     ============================================================ -->
<script src="instructor-data.js"></script>

<!-- ============================================================
     TOOLS DATA — 工具圖鑑資料（由 scripts/scrape-tools.mjs 產生）
     重新擷取請執行：npm run scrape:tools
     ============================================================ -->
<script src="tools-data.js"></script>
```

- [ ] **Step 2: 驗證**

```bash
grep -n "tools-data.js" d:/GitHub/ai-workshop/index.html
```

Expected：列出至少一行包含 `<script src="tools-data.js">`。

---

## Task 5: 在 index.html 加上 Tool Gallery 的 CSS

**Files:**
- Modify: `index.html` (在 instructor card CSS 區塊之後、generic table 區塊之前)

- [ ] **Step 1: 找到插入點**

用 Grep 確認位置：

```bash
grep -n "generic table" d:/GitHub/ai-workshop/index.html | head -2
```

Expected：找到 `/* generic table */` 註解所在行（應在第 ~660 行附近，視 instructor card CSS 已加入後實際行號為準）。

- [ ] **Step 2: 在該行之前插入 Tool Gallery CSS**

用 Edit 工具，把 `  /* generic table */` 行之前插入新樣式：

old_string:
```css
  /* 響應式：880px 以下改單欄 */
  @media (max-width: 880px) {
    .instructor-card {
      grid-template-columns: 1fr;
      text-align: center;
    }
    .instructor-avatar {
      margin: 0 auto;
      width: 130px;
      height: 130px;
    }
    .instructor-stats { justify-content: center; }
  }

  /* generic table */
```

new_string:
```css
  /* 響應式：880px 以下改單欄 */
  @media (max-width: 880px) {
    .instructor-card {
      grid-template-columns: 1fr;
      text-align: center;
    }
    .instructor-avatar {
      margin: 0 auto;
      width: 130px;
      height: 130px;
    }
    .instructor-stats { justify-content: center; }
  }

  /* ===================== tool gallery ===================== */
  /* 工具圖鑑：Day 篩選 chip + 工具卡片網格 */
  .toolbox-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 14px 0 18px;
  }
  .toolbox-filters .chip {
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .toolbox-filters .chip:hover { border-color: var(--accent); }
  .toolbox-filters .chip.active {
    background: var(--accent);
    color: var(--surface);
    border-color: var(--accent);
  }

  .toolbox-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
    margin-top: 8px;
  }
  .tool-card {
    display: flex;
    flex-direction: column;
    text-decoration: none;
    color: inherit;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    overflow: hidden;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }
  .tool-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 22px -10px var(--accent);
    border-color: var(--accent);
  }
  .tool-card.is-hidden { display: none; }

  .tool-screenshot {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    object-position: top;
    background: var(--surface-2);
    display: block;
  }
  .tool-screenshot.is-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-size: 12px;
  }

  .tool-card-body {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }
  .tool-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .tool-tagline {
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--muted);
    flex: 1;
  }
  .tool-days {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }
  .tool-day-tag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent-deep);
    border: 1px solid var(--border);
  }

  /* generic table */
```

- [ ] **Step 3: 驗證 CSS 有插入**

```bash
grep -n "tool-card" d:/GitHub/ai-workshop/index.html | head -3
```

Expected：至少 3 行匹配。

---

## Task 6: 實作 renderToolbox() 函式

**Files:**
- Modify: `index.html` (在 `function statCell()` 之後、`function renderSharedCase()` 之前)

實際上 `renderToolbox` 放哪都行（function 提升），但放在 `renderMaterials` 之後語意最連貫。我們選 `function renderQuiz()` 之前插入。

- [ ] **Step 1: 在 renderMaterials() 之後、renderQuiz() 之前插入 renderToolbox()**

找到 `renderMaterials()` 結尾與 `renderQuiz()` 開頭之間的位置：

old_string:
```javascript
    root.append(el('div', { class: 'note' },
      '所有素材以雙品牌（暖光咖啡 / 綠野選物）為情境設計 — 學員可任選一條路線完整跑完 4 天，也可中途切換。'));

    return root;
  }

  // ============================================================
  //  區塊：結訓測驗
  // ============================================================
  function renderQuiz() {
```

new_string:
```javascript
    root.append(el('div', { class: 'note' },
      '所有素材以雙品牌（暖光咖啡 / 綠野選物）為情境設計 — 學員可任選一條路線完整跑完 4 天，也可中途切換。'));

    return root;
  }

  // ============================================================
  //  區塊：工具圖鑑（Tool Gallery）
  //  資料來源：window.TOOLS（由 scripts/scrape-tools.mjs 產生）
  // ============================================================
  function renderToolbox() {
    const root = el('section', { class: 'chapter', id: 'toolbox' });
    root.append(el('header', {},
      el('span', { class: 'eyebrow' }, '4 天課程使用工具'),
      el('h2', {}, '工具圖鑑'),
      el('div', { class: 'lead' }, '4 天課程會用到的 AI 工具一覽。點擊任一張卡片開啟官方頁面；用上方 Day 篩選快速找到當日工具。')
    ));

    // 若資料未載入或為空，顯示提示
    if (!Array.isArray(window.TOOLS) || window.TOOLS.length === 0) {
      root.append(el('div', { class: 'note' },
        '工具資料尚未擷取。請執行：npm run scrape:tools'));
      return root;
    }

    // Day 篩選 chips
    const filters = el('div', { class: 'toolbox-filters' });
    const days = ['all', 1, 2, 3, 4];
    days.forEach(d => {
      const label = d === 'all' ? '全部' : `Day ${d}`;
      const chip = el('button', { class: 'chip' + (d === 'all' ? ' active' : ''), 'data-day': String(d) }, label);
      chip.addEventListener('click', () => {
        // 切換 active
        filters.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        // 篩選卡片
        const current = chip.dataset.day;
        grid.querySelectorAll('.tool-card').forEach(card => {
          const cardDays = (card.dataset.days || '').split(' ').filter(Boolean);
          const visible = current === 'all' || cardDays.includes(current);
          card.classList.toggle('is-hidden', !visible);
        });
      });
      filters.append(chip);
    });
    root.append(filters);

    // 卡片網格
    const grid = el('div', { class: 'toolbox-grid' });
    window.TOOLS.forEach(t => grid.append(renderToolCard(t)));
    root.append(grid);

    return root;
  }

  /**
   * 渲染單張工具卡片
   */
  function renderToolCard(tool) {
    const days = Array.isArray(tool.days) ? tool.days : [];
    const card = el('a', {
      class: 'tool-card',
      href: tool.url,
      target: '_blank',
      rel: 'noopener',
      'data-days': days.map(String).join(' ')
    });

    // 截圖（失敗時顯示文字 placeholder）
    if (tool.screenshot && tool.scrapeStatus === 'ok') {
      card.append(el('img', {
        class: 'tool-screenshot',
        src: tool.screenshot,
        alt: tool.name,
        loading: 'lazy'
      }));
    } else {
      card.append(el('div', { class: 'tool-screenshot is-placeholder' },
        '（截圖待擷取）'));
    }

    const body = el('div', { class: 'tool-card-body' });
    body.append(el('div', { class: 'tool-name' }, tool.name));
    body.append(el('div', { class: 'tool-tagline' }, tool.tagline || ''));
    if (days.length) {
      const tagWrap = el('div', { class: 'tool-days' });
      days.forEach(d => tagWrap.append(el('span', { class: 'tool-day-tag' }, `Day ${d}`)));
      body.append(tagWrap);
    }
    card.append(body);
    return card;
  }

  // ============================================================
  //  區塊：結訓測驗
  // ============================================================
  function renderQuiz() {
```

- [ ] **Step 2: 驗證新增的函式存在**

```bash
grep -n "function renderToolbox\|function renderToolCard" d:/GitHub/ai-workshop/index.html
```

Expected：兩行（renderToolbox 與 renderToolCard 各一）。

---

## Task 7: 把 renderToolbox 加進渲染序、加入 sidebar

**Files:**
- Modify: `index.html` (兩處)

- [ ] **Step 1: 在 NAV_ITEMS 加 toolbox 條目**

找到 NAV_ITEMS 陣列：

old_string:
```javascript
  const NAV_ITEMS = [
    { id: 'overview',           num: '00', label: '課程總覽',       group: '前置' },
    { id: 'shared-case',        num: '01', label: '共用案例設定',   group: '前置' },
    { id: 'day1',               num: 'D1', label: '產業趨勢 + AI 基礎',     group: '4 天課程', meta: '5/13' },
    { id: 'day2',               num: 'D2', label: 'AI 多媒體製作',           group: '4 天課程', meta: '5/20' },
    { id: 'day3',               num: 'D3', label: '行政與財務整理',          group: '4 天課程', meta: '5/27' },
    { id: 'day4',               num: 'D4', label: 'AI 代理 + 成果展示',      group: '4 天課程', meta: '6/3' },
    { id: 'materials-overview', num: 'M',  label: '教學素材總覽',   group: '工具' },
    { id: 'quiz',               num: 'Q',  label: '結訓測驗',       group: '工具' }
  ];
```

new_string:
```javascript
  const NAV_ITEMS = [
    { id: 'overview',           num: '00', label: '課程總覽',       group: '前置' },
    { id: 'shared-case',        num: '01', label: '共用案例設定',   group: '前置' },
    { id: 'day1',               num: 'D1', label: '產業趨勢 + AI 基礎',     group: '4 天課程', meta: '5/13' },
    { id: 'day2',               num: 'D2', label: 'AI 多媒體製作',           group: '4 天課程', meta: '5/20' },
    { id: 'day3',               num: 'D3', label: '行政與財務整理',          group: '4 天課程', meta: '5/27' },
    { id: 'day4',               num: 'D4', label: 'AI 代理 + 成果展示',      group: '4 天課程', meta: '6/3' },
    { id: 'materials-overview', num: 'M',  label: '教學素材總覽',   group: '工具' },
    { id: 'toolbox',            num: 'T',  label: '工具圖鑑',       group: '工具' },
    { id: 'quiz',               num: 'Q',  label: '結訓測驗',       group: '工具' }
  ];
```

- [ ] **Step 2: 在 app render 流程把 renderToolbox() 加進去**

找到 `root.append(renderMaterials())`：

old_string:
```javascript
    root.append(renderOverview());
    root.append(renderSharedCase());
    root.append(renderDay('day1'));
    root.append(renderDay('day2'));
    root.append(renderDay('day3'));
    root.append(renderDay('day4'));
    root.append(renderMaterials());
    root.append(renderQuiz());
```

new_string:
```javascript
    root.append(renderOverview());
    root.append(renderSharedCase());
    root.append(renderDay('day1'));
    root.append(renderDay('day2'));
    root.append(renderDay('day3'));
    root.append(renderDay('day4'));
    root.append(renderMaterials());
    root.append(renderToolbox());
    root.append(renderQuiz());
```

- [ ] **Step 3: 驗證兩處改動**

```bash
grep -n "toolbox" d:/GitHub/ai-workshop/index.html | grep -v "scrape\|comment\|//"
```

Expected：至少看到 NAV_ITEMS 條目、`renderToolbox()` 呼叫、`id: 'toolbox'` section、CSS 多筆 `.toolbox-`。

---

## Task 8: 建立 verify-toolbox.mjs 驗證腳本

**Files:**
- Create: `scripts/verify-toolbox.mjs`

- [ ] **Step 1: 建立驗證腳本**

建立 `d:/GitHub/ai-workshop/scripts/verify-toolbox.mjs`，完整內容：

```javascript
// =============================================================================
// 驗證腳本：開啟本地網頁 → 確認工具圖鑑渲染、Day 篩選可動作 → 截圖
// 執行前提：先啟動本地伺服器（npm run serve），預設監聽 8765
// =============================================================================

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SCREENSHOT_DIR = resolve(ROOT, 'data');
const URL = process.env.URL || 'http://localhost:8765/';

const EXPECTED_TOOL_COUNT = 6;

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'zh-TW'
  });
  const page = await context.newPage();

  // 收集 console 錯誤
  const errors = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`);
  });

  console.log(`🌐 開啟 ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  // 1) 等工具圖鑑渲染
  await page.waitForSelector('#toolbox .toolbox-grid', { timeout: 10000 });

  // 2) 斷言：卡片數量等於 EXPECTED_TOOL_COUNT
  const cardCount = await page.locator('#toolbox .tool-card').count();
  assert.equal(cardCount, EXPECTED_TOOL_COUNT, `卡片應為 ${EXPECTED_TOOL_COUNT} 張，實際 ${cardCount}`);
  console.log(`  ✓ 卡片數正確：${cardCount}`);

  // 3) 斷言：每張卡片都有非空的 name 與 tagline
  const facts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('#toolbox .tool-card')).map((c) => ({
      name: c.querySelector('.tool-name')?.textContent?.trim() || '',
      tagline: c.querySelector('.tool-tagline')?.textContent?.trim() || '',
      days: c.dataset.days || '',
      hasScreenshot: !!c.querySelector('img.tool-screenshot')
    }));
  });
  facts.forEach((f, i) => {
    assert.ok(f.name, `第 ${i + 1} 張卡片 name 為空`);
    assert.ok(f.tagline, `第 ${i + 1} 張卡片 tagline 為空`);
  });
  console.log('  ✓ 所有卡片 name + tagline 非空');

  // 4) Day 2 篩選測試：點 chip 後，只有 days 包含 "2" 的卡片可見
  await page.locator('#toolbox .toolbox-filters .chip[data-day="2"]').click();
  await page.waitForTimeout(300);
  const visibleDay2 = await page.locator('#toolbox .tool-card:not(.is-hidden)').count();
  console.log(`  ✓ Day 2 篩選後可見 ${visibleDay2} 張`);
  // Day 2 工具應為 Gemini + Flow = 2 張（Whisk 已併入 Flow）
  assert.equal(visibleDay2, 2, `Day 2 應顯示 2 張（Gemini/Flow），實際 ${visibleDay2}`);

  // 5) 點「全部」復原
  await page.locator('#toolbox .toolbox-filters .chip[data-day="all"]').click();
  await page.waitForTimeout(300);

  // 6) 截圖 verify-toolbox.png 供人眼確認
  await page.locator('#toolbox').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const shot = resolve(SCREENSHOT_DIR, 'verify-toolbox.png');
  await page.locator('#toolbox').screenshot({ path: shot });
  console.log(`  ✓ 已截：${shot}`);

  // 7) Console / pageerror 檢查
  if (errors.length) {
    console.log('\n⚠ 偵測到頁面錯誤：');
    errors.forEach((e) => console.log('  ' + e));
    process.exit(1);
  }

  console.log('\n✅ Toolbox 驗證全部通過');
  await browser.close();
}

main().catch((err) => {
  console.error('\n❌ 驗證失敗：', err.message);
  process.exit(1);
});
```

- [ ] **Step 2: 語法檢查**

```bash
cd d:/GitHub/ai-workshop && node --check scripts/verify-toolbox.mjs
```

Expected：無輸出（成功）。

---

## Task 9: 端到端執行驗證

**Files:**
- 不修改任何檔案，只執行驗證

- [ ] **Step 1: 啟動本地伺服器（背景執行）**

```bash
cd d:/GitHub/ai-workshop && npx serve . -l 8765 --no-clipboard
```

（用 run_in_background）

- [ ] **Step 2: 等伺服器就緒**

等到 `curl -s -o /dev/null -w "%{http_code}" http://localhost:8765/` 回 `200`。

- [ ] **Step 3: 執行驗證腳本**

```bash
cd d:/GitHub/ai-workshop && node scripts/verify-toolbox.mjs
```

Expected output 末尾：
```
✅ Toolbox 驗證全部通過
```

- [ ] **Step 4: 開啟 verify-toolbox.png 人眼確認**

用 Read 工具讀 `d:/GitHub/ai-workshop/data/verify-toolbox.png`，確認：
- 6 張卡片整齊排列
- 每張有截圖、名稱、tagline、Day 標籤
- Day 篩選 chip 排在卡片上方
- 視覺風格與既有區塊一致（背景、字體、顏色）

- [ ] **Step 5: 關閉本地伺服器（TaskStop 背景任務）**

---

## Task 10: 暗色模式視覺驗證

**Files:**
- 不修改任何檔案，只執行驗證

- [ ] **Step 1: 啟動本地伺服器**（同 Task 9 Step 1，可重用同一個 background task）

- [ ] **Step 2: 在驗證腳本中加上深色模式截圖（一次性，不入版控）**

直接用一次性 inline 命令（不寫進腳本），驗證暗色：

```bash
cd d:/GitHub/ai-workshop && node -e "
import('playwright').then(async ({ chromium }) => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1280, height: 900 }});
  const page = await ctx.newPage();
  await page.goto('http://localhost:8765/', { waitUntil: 'networkidle' });
  // 觸發暗色（依現有 toggle 機制；若預設依 prefers-color-scheme 則 colorScheme: 'dark' 已生效）
  await page.waitForSelector('#toolbox .tool-card');
  await page.locator('#toolbox').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.locator('#toolbox').screenshot({ path: 'data/verify-toolbox-dark.png' });
  await browser.close();
  console.log('暗色截圖：data/verify-toolbox-dark.png');
});
"
```

- [ ] **Step 3: 用 Read 工具看 verify-toolbox-dark.png**

確認：
- 卡片背景、文字、邊框使用暗色變數
- 工具截圖（淺色頁面）在暗色容器中不刺眼（可接受 — 工具公開頁本身是淺色）
- chip active 狀態仍清晰可辨

- [ ] **Step 4: 關閉本地伺服器**

---

## Self-Review Checklist（執行者自審）

實作完成後，按下面項目逐一確認：

| # | 項目 | 確認方式 |
|---|---|---|
| 1 | 6 個工具的截圖都存在於 `data/tools/` | `ls data/tools/ \| wc -l` 等於 6 |
| 2 | `tools-data.js` 第一行為註解、含 `window.TOOLS = [` | `head -3 tools-data.js` |
| 3 | `index.html` 有載入 `<script src="tools-data.js">` | grep |
| 4 | 工具圖鑑章節在「教學素材總覽」與「結訓測驗」之間 | 開瀏覽器看順序 |
| 5 | sidebar 有「T 工具圖鑑」項目 | 開瀏覽器看左側 |
| 6 | Day 1/2/3/4 篩選都正確（每個 Day 至少一張卡） | 手動點擊測試 |
| 7 | 點卡片會新分頁開啟工具官方頁 | 手動測試 |
| 8 | 880px 以下 RWD 卡片變單欄 | resize 視窗測試 |
| 9 | 暗色模式所有元素仍清晰 | 切換主題鈕測試 |
| 10 | 重跑 `npm run scrape:tools` 不會壞掉 | 跑一次 |

---

## 完成條件（Definition of Done）

1. `npm run scrape:tools` 全綠（7/0）
2. `npm run verify:toolbox`（搭配 serve）通過所有斷言
3. 人眼確認 `data/verify-toolbox.png` 與 `data/verify-toolbox-dark.png` 視覺品質可接受
4. Self-Review Checklist 全部打勾
