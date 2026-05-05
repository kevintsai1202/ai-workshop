// =============================================================================
// 擷取工具公開頁腳本（Playwright）
// 用途：對 7 個課程使用的 AI 工具公開頁截圖，產出 data/tools.json + tools-data.js
//
// 模式：
//   1) 全自動（預設）：node scripts/scrape-tools.mjs
//      → headless 跑全部 7 個工具
//   2) 子集模式：node scripts/scrape-tools.mjs --ids codex,notebooklm
//      → 只跑指定 id，結果合併進現有 tools.json（不覆蓋其他工具）
//   3) 半自動模式：加上 --headed --pause
//      → 開可見瀏覽器 + 截圖前等使用者按 Enter
//   4) CDP 模式：加上 --cdp --pause（推薦給有反爬偵測的網站如 OpenAI）
//      → 連接使用者已啟動的真實 Chrome（避免 Playwright 自動化指紋被偵測）
//      → 前置：關閉所有 Chrome 後執行：
//        chrome.exe --remote-debugging-port=9222 --user-data-dir=%TEMP%\chrome-cdp
//
// 設計原則（依 CLAUDE.md）：
//   1) 可重跑：純粹由 TOOLS_LIST 驅動
//   2) 單支失敗不中斷批次：try/catch 包單支，標 scrapeStatus 後繼續
//   3) 子集執行不破壞既有資料：合併寫回，不全量覆蓋
// =============================================================================

import { chromium } from 'playwright';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

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
    tagline: 'Google AI 影片工具，內建 Nano Banana（生圖）+ Veo（生影片）。原 Whisk 圖像合成功能已整合於此。',
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
 * @param {object} opts.pause 是否截圖前等使用者按 Enter（半自動模式用）
 * @param {object} opts.rl    readline 介面（pause 模式才需要）
 * 失敗回傳 { success: false, error }；成功回傳 { success: true, screenshot: 相對路徑 }
 */
async function scrapeOne(page, tool, opts = {}) {
  console.log(`\n📌 擷取 ${tool.name} (${tool.url})`);
  try {
    // 用 domcontentloaded 而非 networkidle：Google / OpenAI 等站點有長連線
    // 分析請求，networkidle 永不觸發。改用 DOM 載完後固定等待動畫穩定。
    await page.goto(tool.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
    await dismissCommonPopups(page);
    await page.waitForTimeout(2500);

    // 半自動模式：等使用者手動登入 / 關彈窗 / 捲到對的位置，按 Enter 後才截圖
    if (opts.pause && opts.rl) {
      console.log(`  ⏸  [半自動] 請在瀏覽器內手動登入或調整畫面，完成後到此終端機按 Enter 截圖...`);
      await opts.rl.question('     按 Enter 繼續：');
    }

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
 * 解析 CLI 參數
 * 支援：--ids gemini,codex（逗號分隔）、--headed、--pause
 */
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { headed: false, pause: false, ids: null, cdp: false, cdpUrl: 'http://localhost:9222' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--headed') opts.headed = true;
    else if (args[i] === '--pause') opts.pause = true;
    else if (args[i] === '--cdp') opts.cdp = true;
    else if (args[i] === '--cdp-url' && args[i + 1]) {
      opts.cdpUrl = args[i + 1];
      i++;
    } else if (args[i] === '--ids' && args[i + 1]) {
      opts.ids = args[i + 1].split(',').map(s => s.trim()).filter(Boolean);
      i++;
    }
  }
  return opts;
}

/**
 * 讀取既有的 data/tools.json（若存在），用於子集執行時的合併
 * 不存在或解析失敗則回傳空陣列
 */
async function loadExistingResults() {
  const jsonPath = resolve(DATA_DIR, 'tools.json');
  try {
    const raw = await readFile(jsonPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * 主流程：跑遍所有工具（或子集）、產出 JSON + tools-data.js
 */
async function main() {
  const opts = parseArgs(process.argv);

  // 過濾要跑的工具清單
  const targetTools = opts.ids
    ? TOOLS_LIST.filter(t => opts.ids.includes(t.id))
    : TOOLS_LIST;

  if (opts.ids && targetTools.length === 0) {
    console.error(`❌ --ids 中找不到任何已知工具。可用 id：${TOOLS_LIST.map(t => t.id).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🛠️  Tool Gallery 擷取（${targetTools.length} 個工具${opts.ids ? '；子集模式' : '；全部'}）`);
  if (opts.cdp) console.log(`    模式：CDP 連接 ${opts.cdpUrl}（使用您現有的 Chrome）`);
  else if (opts.headed) console.log(`    模式：可見瀏覽器（Playwright 啟動）`);
  if (opts.pause) console.log(`    模式：截圖前暫停（半自動）`);
  console.log('');

  await mkdir(TOOLS_DIR, { recursive: true });

  // CDP 模式：連接使用者已啟動的真實 Chrome；其他模式：Playwright 自己啟動
  let browser, context;
  if (opts.cdp) {
    try {
      browser = await chromium.connectOverCDP(opts.cdpUrl);
    } catch (err) {
      console.error(`\n❌ 無法連接到 ${opts.cdpUrl}`);
      console.error(`   請確認 Chrome 已用以下指令啟動（PowerShell）：`);
      console.error(`   & "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\\chrome-cdp"`);
      console.error(`   錯誤：${err.message}\n`);
      process.exit(1);
    }
    // CDP 模式下沿用 Chrome 既有 context（保留 cookies / 登入態）
    const contexts = browser.contexts();
    context = contexts[0] || (await browser.newContext());
  } else {
    browser = await chromium.launch({ headless: !opts.headed });
    context = await browser.newContext({
      locale: 'zh-TW',
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    });
  }
  const page = await context.newPage();

  // 半自動模式所需的 readline；非半自動模式不建立避免霸佔 stdin
  const rl = opts.pause ? createInterface({ input: stdin, output: stdout }) : null;

  // 跑這次要更新的工具
  const updatedById = new Map();
  for (const tool of targetTools) {
    const r = await scrapeOne(page, tool, { pause: opts.pause, rl });
    updatedById.set(tool.id, {
      ...tool,
      screenshot: r.success ? r.screenshot : null,
      scrapeStatus: r.success ? 'ok' : 'failed',
      scrapeError: r.success ? null : r.error,
      scrapedAt: new Date().toISOString()
    });
  }

  // 釋放本次新開的 page，避免在 CDP 模式下污染使用者 Chrome
  await page.close().catch(() => {});
  if (rl) rl.close();
  // CDP 模式：只 disconnect 不真的關 Chrome；其他模式：完全關閉
  if (opts.cdp) await browser.close().catch(() => {});
  else await browser.close();

  // 子集模式：合併進既有 tools.json，未跑到的工具保留原資料
  // 全量模式：以 TOOLS_LIST 順序輸出（自然排序）
  let results;
  if (opts.ids) {
    const existing = await loadExistingResults();
    const existingById = new Map(existing.map(r => [r.id, r]));
    // 以 TOOLS_LIST 順序為主，本次更新的優先採用，其餘沿用 existing；都沒有則補一筆 untouched
    results = TOOLS_LIST.map(t => updatedById.get(t.id) || existingById.get(t.id) || {
      ...t,
      screenshot: null,
      scrapeStatus: 'untouched',
      scrapeError: null,
      scrapedAt: null
    });
  } else {
    results = TOOLS_LIST.map(t => updatedById.get(t.id));
  }

  // 寫 JSON
  const jsonPath = resolve(DATA_DIR, 'tools.json');
  await writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n✅ 資料 JSON：${jsonPath}`);

  // 寫 tools-data.js（給 index.html 用 <script src> 載入）
  const jsPath = resolve(ROOT, 'tools-data.js');
  const jsContent = `// 由 scripts/scrape-tools.mjs 自動產生，請勿手動編輯\n// 重跑：npm run scrape:tools\nwindow.TOOLS = ${JSON.stringify(results, null, 2)};\n`;
  await writeFile(jsPath, jsContent, 'utf-8');
  console.log(`✅ 注入用 JS：${jsPath}`);

  // 摘要（僅針對本次跑的工具）
  const updatedArr = Array.from(updatedById.values());
  const ok = updatedArr.filter(r => r.scrapeStatus === 'ok').length;
  const fail = updatedArr.length - ok;
  console.log(`\n📊 本次更新：成功 ${ok} / 失敗 ${fail}（共 ${updatedArr.length} 個工具）`);
  if (fail > 0) {
    console.log('失敗清單：');
    updatedArr.filter(r => r.scrapeStatus === 'failed').forEach(r => console.log(`  - ${r.name}: ${r.scrapeError}`));
  }
}

main().catch((err) => {
  console.error('❌ 主流程崩潰：', err);
  process.exit(1);
});
