// =============================================================================
// 擷取 Antigravity 產品介面綜覽（Playwright）
// 用途：截 antigravity.google/product 的「Explore the product」區塊
//       給 Day 4「Antigravity 介面導覽」概念卡用
// 產出：assets/illustrations/day4-antigravity-ui.png
//
// 模式：
//   1) 預設（headless）：     node scripts/scrape-antigravity-ui.mjs
//   2) 顯示瀏覽器：           node scripts/scrape-antigravity-ui.mjs --headed
//   3) 半自動（截前暫停）：    node scripts/scrape-antigravity-ui.mjs --headed --pause
//
// 設計重點：
//   - viewport 用 1280×4000（大 height）讓整個「Explore the product」區段一次落入
//   - 用 page.evaluate 找 heading 與最後一個產品圖（Browser Use）的 bounding box
//     算出整段 clip，避免抓到 hero 或案例 carousel
//   - 等所有 product/*.jpg 載完才截，否則灰底框會出現在圖上
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
const OUT_PATH = resolve(OUT_DIR, 'day4-antigravity-ui.png');
const TARGET_URL = 'https://antigravity.google/product';

// 解析 CLI 參數
function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    headed: args.includes('--headed'),
    pause: args.includes('--pause')
  };
}

/**
 * 等所有 product/*.jpg 圖載完
 * （SPA 圖片是動態 import，不等會截到灰底框）
 */
async function waitForProductImages(page) {
  await page.waitForFunction(() => {
    const imgs = Array.from(document.querySelectorAll('img'))
      .filter(img => img.src.includes('/product/'));
    if (imgs.length < 5) return false; // 至少要看到 5 張產品圖
    return imgs.every(img => img.complete && img.naturalWidth > 0);
  }, { timeout: 20000 });
}

/**
 * 計算「Explore the product」頂端 3:2 區段的 bounding box
 *
 * 為何不抓整段：頁面 grid 在 1280-2400 寬都維持 1-2 col，整段 portrait（1:1.4）
 * 套進 .illustration--inline 的 3:2 容器會出現大留白。改抓頂端含標題 + 主圖
 * Agent Manager + 首列雙欄（Editor / Agent）的 3:2 landscape 區段，視覺平衡。
 *
 * 完整七區塊由概念卡的 list 文字補上，圖只負責「看一眼大概長這樣」。
 */
async function getExploreSectionBounds(page) {
  return await page.evaluate(() => {
    const heading = Array.from(document.querySelectorAll('h2'))
      .find(h => h.textContent.includes('Explore the product'));
    if (!heading) return null;

    const headRect = heading.getBoundingClientRect();
    const top = headRect.top + window.scrollY;
    const width = window.innerWidth;
    // 3:2 landscape：高度 = 寬度 × 2/3
    const height = Math.round(width * 2 / 3);

    return {
      x: 0,
      y: Math.max(0, top - 24),
      width,
      height
    };
  });
}

async function main() {
  const opts = parseArgs(process.argv);
  console.log(`\n📸 擷取 Antigravity 產品介面綜覽：${TARGET_URL}`);
  if (opts.headed) console.log(`   模式：可見瀏覽器`);
  if (opts.pause) console.log(`   模式：截圖前暫停`);

  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: !opts.headed });
  // viewport 寬 2400 讓 grid auto-fit 從 2-col reflow 為 3+ col，避免單張圖過於 portrait
  // height 4000 確保整個 Explore 區段一次落入單張視口
  const context = await browser.newContext({ viewport: { width: 2400, height: 4000 } });
  const page = await context.newPage();

  try {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});

    // 等 SPA 渲染出 Explore 標題
    await page.waitForSelector('h2:has-text("Explore the product")', { timeout: 15000 });
    // 等所有產品圖載完（避免灰底）
    await waitForProductImages(page);
    // 字體 / 動畫 settle
    await page.waitForTimeout(2000);

    if (opts.pause) {
      const rl = createInterface({ input: stdin, output: stdout });
      console.log(`\n   ⏸  瀏覽器已開啟，請手動調整後按 Enter 截圖...`);
      await rl.question('      按 Enter 繼續：');
      rl.close();
    }

    const bounds = await getExploreSectionBounds(page);
    if (!bounds) {
      throw new Error('無法定位「Explore the product」區段');
    }
    console.log(`   區段 bounds：x=${bounds.x} y=${bounds.y} w=${bounds.width} h=${bounds.height}`);

    await page.screenshot({ path: OUT_PATH, clip: bounds });
    console.log(`\n✓ 已截：${OUT_PATH}`);
  } catch (err) {
    console.error(`\n❌ 失敗：${err.message}`);
    await browser.close();
    process.exit(1);
  }

  await browser.close();
}

main();
