// =============================================================================
// 擷取 Antigravity 下載頁截圖（Playwright）
// 用途：截 antigravity.google/download 給 Day 4「Antigravity 桌面端安裝」概念卡用
// 產出：assets/illustrations/day4-antigravity-install.png
//
// 模式：
//   1) 預設（headless）：     node scripts/scrape-antigravity-install.mjs
//   2) 顯示瀏覽器：           node scripts/scrape-antigravity-install.mjs --headed
//   3) 半自動（截前暫停）：    node scripts/scrape-antigravity-install.mjs --headed --pause
//   4) 全頁（不裁切）：        node scripts/scrape-antigravity-install.mjs --full
//
// 設計原則（依 CLAUDE.md）：
//   1) 可重跑：純粹由本檔內常數驅動，未來換頁面或檔名只需改 OUT_PATH / TARGET_URL
//   2) SPA 等待：先 domcontentloaded → 再等下載按鈕關鍵字（Download/macOS/Windows）出現
//   3) 失敗保險：找不到關鍵字也會截，避免空轉；有錯非零退出
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
const OUT_PATH = resolve(OUT_DIR, 'day4-antigravity-install.png');
const TARGET_URL = 'https://antigravity.google/download';

// 解析 CLI 參數
function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    headed: args.includes('--headed'),
    pause: args.includes('--pause'),
    full: args.includes('--full')
  };
}

/**
 * 主流程：開瀏覽器 → 等 SPA → 截圖 → 關閉
 */
async function main() {
  const opts = parseArgs(process.argv);
  console.log(`\n📥 擷取 Antigravity 下載頁：${TARGET_URL}`);
  if (opts.headed) console.log(`   模式：可見瀏覽器`);
  if (opts.pause) console.log(`   模式：截圖前暫停（半自動）`);
  if (opts.full) console.log(`   模式：全頁截圖（不裁切到 1280x720）`);

  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: !opts.headed });
  // 鎖定 1280x720 viewport，與既有 data/tools/*.png 同尺寸方便對照
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    // SPA 站點用 domcontentloaded（networkidle 在持續分析請求的站永不觸發）
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});

    // 等下載相關文字出現（多語/多平台 fallback）
    await page
      .waitForSelector('text=/Download|下載|macOS|Mac OS|Windows/i', { timeout: 15000 })
      .catch(() => console.warn('   ⚠ 未偵測到下載按鈕文字，仍嘗試截圖'));

    // 動畫 / 字體 settle
    await page.waitForTimeout(3000);

    // 半自動：讓使用者手動關彈窗 / 同意 cookie / 捲到對的位置
    if (opts.pause) {
      const rl = createInterface({ input: stdin, output: stdout });
      console.log(`\n   ⏸  請在瀏覽器內調整（關彈窗、同意 cookie、捲動），完成後到此終端機按 Enter 截圖...`);
      await rl.question('      按 Enter 繼續：');
      rl.close();
    }

    if (opts.full) {
      await page.screenshot({ path: OUT_PATH, fullPage: true });
    } else {
      await page.screenshot({
        path: OUT_PATH,
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      });
    }
    console.log(`\n✓ 已截：${OUT_PATH}`);
  } catch (err) {
    console.error(`\n❌ 失敗：${err.message}`);
    await browser.close();
    process.exit(1);
  }

  await browser.close();
}

main();
