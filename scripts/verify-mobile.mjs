// =============================================================================
// 驗證腳本：手機版響應式（≤768px）UX 與排版
// -----------------------------------------------------------------------------
// 驗證項目：
//   1. iPhone 13 viewport（390×844）下，sidebar 預設隱藏，主內容滿版
//   2. 點漢堡鈕 → sidebar 從左側拉出，背景遮罩出現
//   3. 點背景遮罩 → sidebar 收回
//   4. 點章節連結 → sidebar 自動收回 + 滾動到該段
//   5. 視窗水平不溢出（沒有橫向捲軸）
//   6. 視口縮放未強制 1.35（手機應為 1）
//   7. 多裝置截圖：iPhone SE / iPhone 13 / iPad Mini / Desktop
//
// 用法：先啟動本地伺服器（`npm run serve` 預設聽 3000，或自訂 port），再執行：
//   URL=http://localhost:3000/ node scripts/verify-mobile.mjs
// 若伺服器在 / 路徑顯示目錄列表（npx serve 某些版本行為），改傳完整路徑：
//   URL=http://localhost:3456/index.html node scripts/verify-mobile.mjs
// =============================================================================

import { chromium, devices } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SCREENSHOT_DIR = resolve(ROOT, 'data', 'mobile-verify');
const URL = process.env.URL || 'http://localhost:3456/';

/** 要測試的多裝置設定組合 */
const PROFILES = [
  { id: 'iphone-se', label: 'iPhone SE', device: devices['iPhone SE'] },
  { id: 'iphone-13', label: 'iPhone 13', device: devices['iPhone 13'] },
  { id: 'ipad-mini', label: 'iPad Mini', device: devices['iPad Mini'] },
  { id: 'desktop', label: 'Desktop 1280', device: { viewport: { width: 1280, height: 900 }, userAgent: 'Mozilla/5.0' } }
];

async function verifyProfile(browser, profile) {
  console.log(`\n📱 ${profile.label}`);
  const context = await browser.newContext({
    ...profile.device,
    locale: 'zh-TW'
  });
  const page = await context.newPage();

  // 收集 console 錯誤
  const errors = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`);
  });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('section.chapter', { timeout: 10000 });

  const isMobile = (profile.device.viewport?.width ?? 1280) <= 768;
  console.log(`  viewport: ${profile.device.viewport?.width}×${profile.device.viewport?.height}（手機=${isMobile}）`);

  // === 通用：偵測水平溢出（除了 sidebar overlay 的 100vw 溢出可允許） ===
  const overflow = await page.evaluate(() => {
    return {
      docWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      bodyOverflow: document.body.scrollWidth > window.innerWidth + 1
    };
  });
  console.log(`  scrollWidth=${overflow.docWidth} / innerWidth=${overflow.viewport}`);
  assert.ok(overflow.docWidth <= overflow.viewport + 2,
    `頁面水平溢出（scrollWidth ${overflow.docWidth} > viewport ${overflow.viewport}）`);
  console.log('  ✓ 無水平溢出');

  // === 手機專屬驗證 ===
  if (isMobile) {
    // 1) zoom 應為 1（不是桌機的 1.35）
    const contentZoom = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return cs.getPropertyValue('--content-zoom').trim();
    });
    assert.equal(contentZoom, '1', `手機 --content-zoom 應為 1，實際為 "${contentZoom}"`);
    console.log('  ✓ --content-zoom = 1');

    // 2) sidebar 預設應隱藏：transform translateX -100%
    const sidebarHidden = await page.evaluate(() => {
      const el = document.querySelector('.sidebar');
      const rect = el.getBoundingClientRect();
      // 隱藏狀態時 sidebar 右邊緣應在視窗左邊（rect.right ≤ 0 或極小）
      return rect.right <= 1;
    });
    assert.ok(sidebarHidden, '手機載入時 sidebar 應預設隱藏在畫面外');
    console.log('  ✓ sidebar 預設隱藏');

    // 3) 主內容無 sidebar 邊距
    const mainMargin = await page.evaluate(() => {
      const el = document.querySelector('.main');
      return getComputedStyle(el).marginLeft;
    });
    assert.equal(mainMargin, '0px', `手機 .main margin-left 應為 0，實際 ${mainMargin}`);
    console.log('  ✓ .main margin-left = 0');

    // 4) 點漢堡鈕 → sidebar 拉出
    await page.click('#sidebar-toggle');
    await page.waitForTimeout(400);
    const sidebarOpen = await page.evaluate(() => {
      const el = document.querySelector('.sidebar');
      const rect = el.getBoundingClientRect();
      return rect.left >= -1 && rect.right > 100;
    });
    assert.ok(sidebarOpen, '點漢堡鈕後 sidebar 應拉出可見');
    console.log('  ✓ 點漢堡鈕 → sidebar 拉出');

    // 5) 背景遮罩可見
    const backdropVisible = await page.evaluate(() => {
      const el = document.querySelector('#sidebar-backdrop');
      return getComputedStyle(el).opacity === '1';
    });
    assert.ok(backdropVisible, '背景遮罩應可見');
    console.log('  ✓ 背景遮罩顯示');

    // === 截圖：sidebar 開啟狀態 ===
    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, `${profile.id}-sidebar-open.png`),
      fullPage: false
    });

    // 6) 點背景遮罩 → 收回
    await page.click('#sidebar-backdrop', { force: true });
    await page.waitForTimeout(400);
    const sidebarClosedAgain = await page.evaluate(() => {
      const el = document.querySelector('.sidebar');
      return el.getBoundingClientRect().right <= 1;
    });
    assert.ok(sidebarClosedAgain, '點遮罩後 sidebar 應收回');
    console.log('  ✓ 點遮罩 → sidebar 收回');

    // 7) 再次拉開，點章節連結 → sidebar 應自動收回
    await page.click('#sidebar-toggle');
    await page.waitForTimeout(300);
    await page.click('.nav-link[data-target="day1"]');
    await page.waitForTimeout(700);
    const sidebarClosedAfterNav = await page.evaluate(() => {
      const el = document.querySelector('.sidebar');
      return el.getBoundingClientRect().right <= 1;
    });
    assert.ok(sidebarClosedAfterNav, '點章節連結後 sidebar 應自動收回');
    console.log('  ✓ 點章節連結 → sidebar 自動收回');
  } else {
    // 桌機驗證：sidebar 預設可見
    const sidebarVisible = await page.evaluate(() => {
      const el = document.querySelector('.sidebar');
      const rect = el.getBoundingClientRect();
      return rect.left >= 0 && rect.width > 100;
    });
    assert.ok(sidebarVisible, '桌機載入時 sidebar 應預設可見');
    console.log('  ✓ 桌機 sidebar 預設可見');
  }

  // === 截圖：首屏（用 instant 強制中斷可能未完成的 smooth scroll） ===
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(800);
  await page.screenshot({
    path: resolve(SCREENSHOT_DIR, `${profile.id}-home.png`),
    fullPage: false
  });

  // === 截圖：滾到 Day 1 章節 ===
  await page.evaluate(() => {
    const el = document.getElementById('day1');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: resolve(SCREENSHOT_DIR, `${profile.id}-day1.png`),
    fullPage: false
  });

  // === 截圖：滾到工具圖鑑 ===
  await page.evaluate(() => {
    const el = document.getElementById('toolbox');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: resolve(SCREENSHOT_DIR, `${profile.id}-toolbox.png`),
    fullPage: false
  });

  // 把預先存在的非 RWD 相關錯誤過濾掉（目前已知：缺一張 illustration 圖）
  // 這些不應讓本次手機驗證紅燈，但仍印出供後續清理
  const KNOWN_PREEXISTING = [
    /day4-skill-install-location\.png/,
    /Failed to load resource: the server responded with a status of 404 \(Not Found\)/
  ];
  const blocking = errors.filter((e) => !KNOWN_PREEXISTING.some((rx) => rx.test(e)));

  if (errors.length) {
    console.log(`  ℹ️ 頁面錯誤 ${errors.length} 條（${blocking.length} 條阻擋驗證、${errors.length - blocking.length} 條為已知預存）：`);
    errors.forEach((e) => console.log('    ' + e));
  }

  await context.close();
  return blocking.length === 0;
}

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  console.log(`🌐 目標：${URL}`);
  console.log(`📁 截圖輸出：${SCREENSHOT_DIR}`);

  const browser = await chromium.launch({ headless: true });
  let allPass = true;

  for (const profile of PROFILES) {
    try {
      const ok = await verifyProfile(browser, profile);
      if (!ok) allPass = false;
    } catch (err) {
      console.error(`\n❌ ${profile.label} 失敗：${err.message}`);
      allPass = false;
    }
  }

  await browser.close();

  if (!allPass) {
    console.log('\n❌ 有部分裝置驗證失敗，請看上方訊息');
    process.exit(1);
  }
  console.log('\n✅ 所有裝置驗證通過');
}

main().catch((err) => {
  console.error('\n❌ 驗證失敗：', err);
  process.exit(1);
});
