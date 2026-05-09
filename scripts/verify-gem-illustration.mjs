// =============================================================================
// 驗證腳本：Day 1 Unit 3「建立自訂 Gem 的 5 步驟」是否渲染插圖
// 確認 day1-gem-builder（PNG 或 SVG fallback）真的出現在該 concept 卡片內，
// 並用高解析度（DPR 2）截下完整插圖供人眼檢查可讀性
// =============================================================================

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SHOT_CARD = resolve(ROOT, 'data', 'verify-gem-illustration.png');
const SHOT_HIRES = resolve(ROOT, 'data', 'verify-gem-illustration-hires.png');
const URL = process.env.URL || 'http://localhost:3000/';

async function main() {
  await mkdir(dirname(SHOT_CARD), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  // 用 deviceScaleFactor=2 等效於 retina 截圖，避免文字模糊
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#day1', { timeout: 10000 });

  // 展開 day1 unit 3 (details accordion)
  await page.evaluate(() => {
    const details = document.querySelectorAll('#day1 details.unit');
    if (details[2]) details[2].open = true;
  });
  await page.waitForTimeout(300);

  // 找「建立自訂 Gem 的 5 步驟」這張卡片
  const result = await page.evaluate(() => {
    const allConceptHeadings = Array.from(document.querySelectorAll('#day1 .concept-heading'));
    const targetHeading = allConceptHeadings.find((h) => h.textContent.includes('建立自訂 Gem 的 5 步驟'));
    if (!targetHeading) return { found: false };
    const card = targetHeading.closest('.concept');
    const img = card.querySelector('.illustration img');
    return {
      found: true,
      hasImg: !!img,
      src: img?.src,
      naturalWidth: img?.naturalWidth ?? 0,
      complete: img?.complete ?? false
    };
  });

  console.log('Initial img state:', result);
  assert.ok(result.found, '找不到「建立自訂 Gem 的 5 步驟」這張卡');
  assert.ok(result.hasImg, '該卡片內沒有 illustration img');

  // 先捲到該卡片附近觸發 lazy load
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('#day1 .concept-heading'));
    const target = headings.find((h) => h.textContent.includes('建立自訂 Gem 的 5 步驟'));
    target.closest('.concept').scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(500);

  // 等圖片真正載入完成（PNG 不存在會自動 fallback 到 SVG，需等到 SVG 載完）
  await page.waitForFunction(() => {
    const headings = Array.from(document.querySelectorAll('#day1 .concept-heading'));
    const target = headings.find((h) => h.textContent.includes('建立自訂 Gem 的 5 步驟'));
    if (!target) return false;
    const img = target.closest('.concept').querySelector('.illustration img');
    return img && img.complete && img.naturalWidth > 0;
  }, { timeout: 10000 });

  // 確認最終 src（可能是 PNG 或 SVG fallback）
  const finalSrc = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('#day1 .concept-heading'));
    const target = headings.find((h) => h.textContent.includes('建立自訂 Gem 的 5 步驟'));
    return target.closest('.concept').querySelector('.illustration img').src;
  });
  console.log('  ✓ 圖片載入完成，最終 src:', finalSrc);

  // 截圖：整張卡片
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('#day1 .concept-heading'));
    const target = headings.find((h) => h.textContent.includes('建立自訂 Gem 的 5 步驟'));
    target.closest('.concept').setAttribute('id', '__verify-target');
  });
  await page.locator('#__verify-target').screenshot({ path: SHOT_CARD });
  console.log(`  ✓ 卡片截圖：${SHOT_CARD}`);

  // 截圖：只截插圖容器，可看高解析細節
  await page.locator('#__verify-target .illustration').screenshot({ path: SHOT_HIRES });
  console.log(`  ✓ 插圖高解析：${SHOT_HIRES}`);

  await browser.close();
  console.log('\n✅ 通過');
}

main().catch((err) => {
  console.error('\n❌ 失敗：', err);
  process.exit(1);
});
