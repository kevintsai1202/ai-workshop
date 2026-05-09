// =============================================================================
// 驗證 4 張新加入的插圖：
//   1. Day 1 G. 4 工具註冊入口（day1-tools-signup.svg）
//   2. Day 2 Flow 工作流四步驟（day2-flow-workflow.svg）
//   3. Day 4 Codex App 安裝（day4-codex-app-install.png）
//   4. Day 4 skills.sh（day4-skills-sh.png）
//
// 用法：先啟動本地伺服器，再執行：
//   URL=http://localhost:3000/ node scripts/verify-new-illustrations.mjs
// =============================================================================

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SHOT_DIR = resolve(ROOT, 'data', 'verify-new-illustrations');
const URL = process.env.URL || 'http://localhost:3000/';

// 4 個目標：dayN, 卡片標題關鍵字, 期望 illustration 名稱
const TARGETS = [
  { dayId: 'day1', unitIndex: 0, headingKw: '4 個工具的註冊入口', expectedName: 'day1-tools-signup' },
  { dayId: 'day2', unitIndex: 1, headingKw: 'Flow 工作流四步驟', expectedName: 'day2-flow-workflow' },
  { dayId: 'day4', unitIndex: 1, headingKw: 'Codex App 安裝', expectedName: 'day4-codex-app-install' },
  { dayId: 'day4', unitIndex: 1, headingKw: 'skills.sh', expectedName: 'day4-skills-sh' }
];

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('section.chapter', { timeout: 10000 });

  for (const target of TARGETS) {
    console.log(`\n📍 ${target.dayId} unit[${target.unitIndex}] / "${target.headingKw}"`);

    // 展開對應 unit
    await page.evaluate(({ dayId, unitIndex }) => {
      const details = document.querySelectorAll(`#${dayId} details.unit`);
      if (details[unitIndex]) details[unitIndex].open = true;
    }, target);
    await page.waitForTimeout(300);

    // 找到該卡片
    const cardInfo = await page.evaluate(({ dayId, headingKw }) => {
      const headings = Array.from(document.querySelectorAll(`#${dayId} .concept-heading`));
      const h = headings.find((x) => x.textContent.includes(headingKw));
      if (!h) return { found: false };
      const card = h.closest('.concept');
      const img = card.querySelector('.illustration img');
      return {
        found: true,
        hasImg: !!img,
        srcHint: img?.src?.split('/').pop() || ''
      };
    }, target);

    assert.ok(cardInfo.found, `[${target.headingKw}] 找不到卡片`);
    assert.ok(cardInfo.hasImg, `[${target.headingKw}] 卡片內無 illustration img`);
    assert.ok(
      cardInfo.srcHint.includes(target.expectedName),
      `[${target.headingKw}] src "${cardInfo.srcHint}" 不含期望名稱 "${target.expectedName}"`
    );
    console.log(`  ✓ 卡片存在、img src 含 ${target.expectedName}`);

    // 捲到該卡觸發 lazy load
    await page.evaluate(({ dayId, headingKw }) => {
      const headings = Array.from(document.querySelectorAll(`#${dayId} .concept-heading`));
      const h = headings.find((x) => x.textContent.includes(headingKw));
      h.closest('.concept').scrollIntoView({ behavior: 'instant', block: 'center' });
    }, target);
    await page.waitForTimeout(500);

    // 等實際載入（PNG 會直接載；SVG 走 fallback）
    await page.waitForFunction(
      ({ dayId, headingKw }) => {
        const headings = Array.from(document.querySelectorAll(`#${dayId} .concept-heading`));
        const h = headings.find((x) => x.textContent.includes(headingKw));
        if (!h) return false;
        const img = h.closest('.concept').querySelector('.illustration img');
        return img && img.complete && img.naturalWidth > 0;
      },
      target,
      { timeout: 10000 }
    );

    const finalSrc = await page.evaluate(({ dayId, headingKw }) => {
      const headings = Array.from(document.querySelectorAll(`#${dayId} .concept-heading`));
      const h = headings.find((x) => x.textContent.includes(headingKw));
      return h.closest('.concept').querySelector('.illustration img').src;
    }, target);
    console.log(`  ✓ 最終載入：${finalSrc.split('/').pop()}`);

    // 截插圖容器供人眼檢查
    await page.evaluate(({ dayId, headingKw }) => {
      const headings = Array.from(document.querySelectorAll(`#${dayId} .concept-heading`));
      const h = headings.find((x) => x.textContent.includes(headingKw));
      const card = h.closest('.concept');
      card.setAttribute('data-verify-active', '1');
    }, target);

    const slug = target.expectedName;
    await page
      .locator(`[data-verify-active="1"] .illustration`)
      .screenshot({ path: resolve(SHOT_DIR, `${slug}.png`) });
    console.log(`  ✓ 截圖：${slug}.png`);

    // 清掉 marker 換下一個
    await page.evaluate(() => {
      document.querySelectorAll('[data-verify-active]').forEach((el) => el.removeAttribute('data-verify-active'));
    });
  }

  await browser.close();
  console.log('\n✅ 全部 4 張新插圖驗證通過');
}

main().catch((err) => {
  console.error('\n❌ 失敗：', err);
  process.exit(1);
});
