// =============================================================================
// 擷取 Day 1/2/3 主要工具的 UI 介紹截圖（Playwright）
// 用途：給每天的「UI 介面導覽」概念卡用，3:2 landscape 格式對齊 Day 4
// 產出：
//   - assets/illustrations/day1-gemini-ui.png
//   - assets/illustrations/day2-flow-ui.png
//   - assets/illustrations/day3-notebooklm-ui.png
//
// 模式：
//   1) 預設（headless 全跑）：node scripts/scrape-day-ui.mjs
//   2) 單一目標：             node scripts/scrape-day-ui.mjs --id gemini
//   3) 顯示瀏覽器：           node scripts/scrape-day-ui.mjs --headed
//   4) 半自動（截前暫停）：    node scripts/scrape-day-ui.mjs --headed --pause
//
// 設計重點：
//   - 統一 viewport 寬 2400，clip 高度 = 寬 × 2/3 = 1600，確保 3:2 landscape
//   - 每個工具用 waitText 等 SPA hero 段渲染完才截
//   - 可選 scrollY 讓截圖偏移到更有資訊的區段（避開 navbar）
// =============================================================================

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'assets', 'illustrations');

// 三個目標工具的截圖配置
//
// 每個目標的 viewport / clip 依該頁實際 hero 高度單獨調整：
//   - Gemini & Flow：marketing 頁 hero 約 720-800px 高，用 1280×720 viewport 讓 hero 滿版
//   - NotebookLM：marketing 是 long-form 含多個 feature 區段，用 2400×1600 一次帶入
const TARGETS = [
  {
    id: 'gemini',
    day: 1,
    url: 'https://gemini.google.com/?hl=zh-TW',
    waitText: ['Gemini', '問問'],
    scrollY: 0,
    viewport: { width: 1280, height: 720 },
    clip: { x: 0, y: 0, width: 1280, height: 720 },
    out: 'day1-gemini-ui.png'
  },
  {
    id: 'flow',
    day: 2,
    url: 'https://labs.google/flow',
    waitText: ['Flow', 'storytelling', 'Create'],
    scrollY: 0,
    viewport: { width: 1280, height: 720 },
    clip: { x: 0, y: 0, width: 1280, height: 720 },
    out: 'day2-flow-ui.png'
  },
  {
    id: 'notebooklm',
    day: 3,
    url: 'https://notebooklm.google/?hl=zh-TW',
    waitText: ['NotebookLM', '筆記', 'notebook'],
    scrollY: 0,
    viewport: { width: 2400, height: 1600 },
    clip: { x: 0, y: 0, width: 2400, height: 1600 },
    out: 'day3-notebooklm-ui.png'
  },
  // Day 1 unit 3 的 Gem Manager 示意圖**已改用手繪 SVG**（assets/illustrations/day1-gem-builder.svg）。
  // 原因：Google 部落格的 Gem Manager 圖只是抽象灰色 placeholder（不是真正介面截圖），
  // 學員看不出怎麼建 Gem。改畫 SVG 並標上 ①②③④⑤ 對應 5 步驟，教學效果更明確。
  // 故移除此 scrape 目標，避免重跑爬蟲時又把無效部落格截圖蓋回去（PNG 不存在時
  // renderIllustration() 會自動 fallback 到 SVG）。

  // ====== 2026-05-09 新增 ======
  // ⚠️ ChatGPT 註冊頁無法 headless scrape — chatgpt.com 全站被 Cloudflare turnstile 擋住，
  // 截到的只是「Verify you are human」對學員無教學價值。
  // 改用手繪 SVG `day1-tools-signup.svg` 統合呈現 4 個工具的註冊入口。
  // 若未來要重抓，請改用 CDP 模式（scripts/start-cdp-chrome.ps1 + --cdp）繞過驗證。
  {
    // Day 4 unit 2「Codex App 安裝（桌面版）」用 — OpenAI Codex 桌面下載頁
    // 與 d4-u1 的 Antigravity 下載頁（已有）對照，學員看到同樣的 macOS/Windows/Linux 三欄式選擇
    id: 'codex-app',
    day: 4,
    url: 'https://developers.openai.com/codex/app',
    waitText: ['Codex', 'Download', 'macOS', 'Windows'],
    scrollY: 0,
    viewport: { width: 1280, height: 800 },
    clip: { x: 0, y: 0, width: 1280, height: 800 },
    out: 'day4-codex-app-install.png'
  },
  {
    // Day 4 unit 2「skills.sh：跨工具 Skills 寶庫」用 — Vercel 維護的 Agent Skills 開源生態系
    // 首頁含主題分類、排行榜、代理篩選三種瀏覽方式，學員從這裡找跟自己工作有關的 Skill
    id: 'skills-sh',
    day: 4,
    url: 'https://skills.sh',
    waitText: ['Skills', 'agent', 'install', 'Skills'],
    scrollY: 0,
    viewport: { width: 1280, height: 800 },
    clip: { x: 0, y: 0, width: 1280, height: 800 },
    out: 'day4-skills-sh.png'
  }
];

// 解析 CLI 參數
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { headed: false, pause: false, id: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--headed') opts.headed = true;
    else if (args[i] === '--pause') opts.pause = true;
    else if (args[i] === '--id' && args[i + 1]) {
      opts.id = args[i + 1];
      i++;
    }
  }
  return opts;
}

/**
 * 處理常見彈窗（cookie 同意、語言提示）
 */
async function dismissCommonPopups(page) {
  const buttonTexts = [
    '全部接受', '全部拒絕', 'Accept all', 'Reject all',
    '不用了', 'No thanks', '稍後再說', 'Maybe later'
  ];
  for (const text of buttonTexts) {
    try {
      const btn = page.locator(`button:has-text("${text}")`).first();
      if (await btn.isVisible({ timeout: 600 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    } catch {
      /* 沒看到就略過 */
    }
  }
}

/**
 * 擷取單一工具的 UI 截圖
 */
async function scrapeOne(page, target, opts) {
  console.log(`\n📸 ${target.id} (Day ${target.day})：${target.url}`);
  const outPath = resolve(OUT_DIR, target.out);

  try {
    // 切到該 target 指定的 viewport
    await page.setViewportSize(target.viewport);

    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
    await dismissCommonPopups(page);

    // 等 SPA 文字渲染（多語/多目標 fallback）
    const textPattern = target.waitText.map(t => t).join('|');
    await page
      .waitForSelector(`text=/${textPattern}/i`, { timeout: 15000 })
      .catch(() => console.warn(`   ⚠ 未偵測到 hero 文字 (${textPattern})，仍嘗試截圖`));

    // 動畫 / 字體 settle
    await page.waitForTimeout(2500);

    // 偏移到目標 scrollY（如有設）
    if (target.scrollY > 0) {
      await page.evaluate(y => window.scrollTo(0, y), target.scrollY);
      await page.waitForTimeout(800);
    }

    // 半自動：讓使用者手動關彈窗 / 同意 cookie / 捲到對的位置
    if (opts.pause) {
      const rl = createInterface({ input: stdin, output: stdout });
      console.log(`\n   ⏸  瀏覽器已開，請調整畫面後到此終端機按 Enter...`);
      await rl.question('      按 Enter：');
      rl.close();
    }

    // 用 target 自定的 clip（已配合 viewport 大小）
    await page.screenshot({ path: outPath, clip: target.clip });
    console.log(`   ✓ 已截：${outPath} (${target.clip.width}×${target.clip.height})`);
    return { ok: true };
  } catch (err) {
    console.error(`   ❌ 失敗：${err.message}`);
    return { ok: false, err: err.message };
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  const targets = opts.id ? TARGETS.filter(t => t.id === opts.id) : TARGETS;

  if (opts.id && targets.length === 0) {
    console.error(`❌ --id 找不到工具：${opts.id}（可用：${TARGETS.map(t => t.id).join(', ')}）`);
    process.exit(1);
  }

  console.log(`\n🛠️  Day 1-3 UI 截圖（${targets.length} 個工具）`);
  if (opts.headed) console.log(`   模式：可見瀏覽器`);
  if (opts.pause) console.log(`   模式：截前暫停`);

  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: !opts.headed });
  // 初始 viewport 任意，scrapeOne 會 per-target 用 page.setViewportSize() 切換
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const results = [];
  for (const target of targets) {
    results.push({ id: target.id, ...(await scrapeOne(page, target, opts)) });
  }

  await browser.close();

  // 總結
  console.log('\n— 結果 —');
  results.forEach(r => console.log(`  ${r.ok ? '✓' : '✗'} ${r.id}${r.err ? ' — ' + r.err : ''}`));

  if (results.some(r => !r.ok)) process.exit(1);
}

main();
