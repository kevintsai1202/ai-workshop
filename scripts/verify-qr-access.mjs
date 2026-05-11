// =============================================================================
// 驗證腳本：開啟本地網頁 → 確認 QR 入口卡片渲染、SVG 載入、複製按鈕可用 → 截圖
// 執行前提：先啟動本地伺服器（npm run serve），預設監聽 3000
//
// 驗證重點：
//   1. #qr-access 元素存在，且為 main-content 的第一個子節點（最前面）
//   2. assets/qr-workshop.svg 載入成功（HTTP 200，非 404）
//   3. 複製按鈕點擊後 clipboard 內容為工作坊網址
//   4. 桌機 + 手機兩種視口截圖（data/qr-access-{desktop,mobile}.png）
// =============================================================================

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SCREENSHOT_DIR = resolve(ROOT, 'data');
const TARGET_URL = process.env.URL || 'http://localhost:3000/index.html';
const EXPECTED_URL = 'https://kevintsai1202.github.io/ai-workshop';

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'zh-TW',
    permissions: ['clipboard-read', 'clipboard-write']
  });
  const page = await context.newPage();

  // 收集 console 錯誤與失敗請求
  const errors = [];
  const failedRequests = [];
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
  page.on('console', m => {
    if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`);
  });
  page.on('requestfailed', req => failedRequests.push(`${req.url()} — ${req.failure()?.errorText}`));

  console.log(`🌐 開啟 ${TARGET_URL}`);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // 1) #qr-access 存在
  const qrWrap = await page.locator('#qr-access');
  await qrWrap.waitFor({ state: 'visible', timeout: 5000 });
  console.log('✅ #qr-access 元素已渲染');

  // 2) 確認 #qr-access 是 #main-content 的第一個子節點
  const isFirst = await page.evaluate(() => {
    const main = document.querySelector('#main-content');
    return main && main.firstElementChild && main.firstElementChild.id === 'qr-access';
  });
  assert.equal(isFirst, true, '#qr-access 應為 main-content 第一個子節點');
  console.log('✅ #qr-access 位於 main-content 最前面');

  // 3) SVG 資源載入成功
  const svgResp = await page.request.get(new URL('assets/qr-workshop.svg', TARGET_URL).toString());
  assert.equal(svgResp.status(), 200, 'assets/qr-workshop.svg 應為 HTTP 200');
  const svgText = await svgResp.text();
  assert.ok(svgText.startsWith('<svg'), 'SVG 內容應以 <svg> 開頭');
  console.log(`✅ QR SVG 載入成功（${(svgText.length / 1024).toFixed(2)} KB）`);

  // 4) 網址文字正確
  const urlText = await page.locator('.qr-url a').first().textContent();
  assert.equal(urlText?.trim(), EXPECTED_URL, '網址顯示應為工作坊正式網址');
  console.log(`✅ 網址文字正確：${urlText.trim()}`);

  // 5) 複製按鈕點擊 → clipboard 內容
  await page.locator('.qr-url-row .prompt-copy-btn').click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(clip, EXPECTED_URL, 'clipboard 應為工作坊網址');
  console.log('✅ 複製按鈕將網址寫入 clipboard');

  // 6) 桌機截圖（聚焦 QR 卡片）
  await page.locator('#qr-access').scrollIntoViewIfNeeded();
  await page.locator('#qr-access').screenshot({
    path: resolve(SCREENSHOT_DIR, 'qr-access-desktop.png')
  });
  console.log('📸 桌機截圖 → data/qr-access-desktop.png');

  // 7) 手機視口截圖
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 13
  await page.waitForTimeout(300);
  await page.locator('#qr-access').scrollIntoViewIfNeeded();
  await page.locator('#qr-access').screenshot({
    path: resolve(SCREENSHOT_DIR, 'qr-access-mobile.png')
  });
  console.log('📸 手機截圖 → data/qr-access-mobile.png');

  if (errors.length) {
    console.error('❌ Console / page errors:');
    errors.forEach(e => console.error('   ' + e));
    process.exitCode = 1;
  }
  if (failedRequests.length) {
    console.error('❌ Failed requests:');
    failedRequests.forEach(r => console.error('   ' + r));
    process.exitCode = 1;
  }

  await browser.close();
  console.log('🎉 驗證完成');
}

main().catch(err => {
  console.error('💥 驗證失敗：', err);
  process.exit(1);
});
