// =============================================================================
// 驗證腳本：開啟本地網頁 → 捲到「課程總覽」→ 截圖講師卡片
// 用途：確認 Playwright 抓到的資料與 圓形去背.png 是否正確注入畫面
// 執行前提：先啟動本地伺服器（npm run serve）監聽指定埠
// =============================================================================

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SCREENSHOT_DIR = resolve(ROOT, 'data');

const URL = process.env.URL || 'http://localhost:8765/';

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'zh-TW',
  });
  const page = await context.newPage();

  // 收集 console 錯誤以利除錯
  const errors = [];
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
  });

  console.log(`🌐 開啟 ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  // 等講師卡片渲染完
  await page.waitForSelector('.instructor-card', { timeout: 10000 });

  // 1) 截整頁總覽（含講師卡片區段）
  await page.locator('#overview').scrollIntoViewIfNeeded();
  const overviewPath = resolve(SCREENSHOT_DIR, 'verify-overview.png');
  await page.locator('#overview').screenshot({ path: overviewPath });
  console.log(`  ✓ 已截：${overviewPath}`);

  // 2) 只截講師卡片本身
  const cardPath = resolve(SCREENSHOT_DIR, 'verify-instructor-card.png');
  // 取講師卡片 + 影片清單的外層 wrapper（renderInstructorCard 回傳的是 div 包卡片+影片）
  const wrapper = page.locator('.instructor-card').locator('xpath=..');
  await wrapper.screenshot({ path: cardPath });
  console.log(`  ✓ 已截：${cardPath}`);

  // 3) 抓畫面上實際渲染出的關鍵欄位文字，確認資料正確接上
  const facts = await page.evaluate(() => ({
    name: document.querySelector('.instructor-name')?.textContent?.trim(),
    handle: document.querySelector('.instructor-handle a')?.textContent?.trim(),
    stats: Array.from(document.querySelectorAll('.instructor-stat')).map((s) => s.textContent.trim()),
    bioPreview: document.querySelector('.instructor-bio')?.textContent?.trim()?.slice(0, 60) + '…',
    videoCount: document.querySelectorAll('.instructor-video').length,
    avatarSrc: document.querySelector('.instructor-avatar')?.getAttribute('src'),
  }));
  console.log('\n📊 畫面上實際渲染：');
  console.log(JSON.stringify(facts, null, 2));

  if (errors.length) {
    console.log('\n⚠ 偵測到頁面錯誤：');
    errors.forEach((e) => console.log('  ' + e));
  } else {
    console.log('\n✅ 頁面無 JS / Console 錯誤');
  }

  await browser.close();
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
