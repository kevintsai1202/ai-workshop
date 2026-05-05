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

// 預期工具數（Whisk 已併入 Flow，故 6 個非原規劃 7 個）
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
