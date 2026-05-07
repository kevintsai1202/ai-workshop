// =============================================================================
// 驗證腳本：開啟本地網頁 → 捲到「案例品牌與角色設定」→ 截圖角色卡片
// 用途：確認 assets/characters/{akai,xiaomei,boss}.png 是否正確注入 .role-cards
// 執行前提：先啟動本地伺服器（npm run serve），預設 http://localhost:3000/
// 執行：URL=http://localhost:3000/ node scripts/verify-role-cards.mjs
// =============================================================================

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SCREENSHOT_DIR = resolve(ROOT, 'data');

const URL = process.env.URL || 'http://localhost:3000/';

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'zh-TW',
  });
  const page = await context.newPage();

  // 收集頁面錯誤（圖片 404 也會在 response 事件出現）
  const errors = [];
  const failedRequests = [];
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
  });
  page.on('response', (resp) => {
    if (resp.status() >= 400 && resp.url().includes('characters/')) {
      failedRequests.push(`${resp.status()} ${resp.url()}`);
    }
  });

  console.log(`🌐 開啟 ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  // 等 .role-cards 渲染完
  await page.waitForSelector('.role-cards .role-card', { timeout: 10000 });

  // 1) 捲到共用案例區段，截整段
  await page.locator('#shared-case').scrollIntoViewIfNeeded();
  const sectionPath = resolve(SCREENSHOT_DIR, 'verify-role-cards-section.png');
  await page.locator('#shared-case').screenshot({ path: sectionPath });
  console.log(`  ✓ 已截：${sectionPath}`);

  // 2) 只截角色卡片網格
  const gridPath = resolve(SCREENSHOT_DIR, 'verify-role-cards.png');
  await page.locator('.role-cards').screenshot({ path: gridPath });
  console.log(`  ✓ 已截：${gridPath}`);

  // 3) 抓畫面上實際渲染的關鍵欄位，確認 3 張卡都有圖片
  const facts = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.role-cards .role-card'));
    return cards.map(c => {
      const img = c.querySelector('.role-portrait img');
      return {
        name: c.querySelector('.role-card-name')?.textContent?.trim(),
        meta: c.querySelector('.role-card-meta')?.textContent?.trim(),
        imgSrc: img?.getAttribute('src'),
        imgComplete: img?.complete,                  // 圖片是否載入完成
        naturalWidth: img?.naturalWidth,             // 0 代表載入失敗
      };
    });
  });
  console.log('\n📊 畫面上實際渲染：');
  console.log(JSON.stringify(facts, null, 2));

  // 4) 檢查每張圖是否成功載入
  const broken = facts.filter(f => !f.naturalWidth);
  if (broken.length) {
    console.log('\n❌ 有圖片未成功載入：');
    broken.forEach(b => console.log(`  - ${b.name}: ${b.imgSrc}`));
  } else {
    console.log('\n✅ 三張角色去背圖均成功載入');
  }

  if (failedRequests.length) {
    console.log('\n⚠ characters/ 路徑有 4xx/5xx 回應：');
    failedRequests.forEach(f => console.log('  ' + f));
  }
  if (errors.length) {
    console.log('\n⚠ 偵測到頁面錯誤：');
    errors.forEach(e => console.log('  ' + e));
  }

  await browser.close();

  // 任一檢查失敗就以非零碼結束，方便 CI 介接
  if (broken.length || failedRequests.length || errors.length) {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
