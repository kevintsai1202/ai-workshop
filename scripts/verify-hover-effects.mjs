// 驗證 hover 動畫：分別截圖 default 與 hover 狀態
// 1. 工具圖鑑 tool-card hover：抬升 + 截圖放大 + 名稱加深
// 2. toolbox chip hover：抬升 + 背景變色
// 3. day-hero 的進場動畫透過 fade-in cascade 觸發（手動 reload 最快驗證）

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOTS_DIR = resolve(__dirname, '..', 'data', 'design-audit');
await mkdir(SHOTS_DIR, { recursive: true });

const URL = process.env.URL || 'http://localhost:3000/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-TW', deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.day-hero');
await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
await page.waitForTimeout(300);

// 等待主要圖片載入
await page.evaluate(async () => {
  document.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
});
await page.waitForTimeout(800);

// === Toolbox 截圖：default → hover 第一張卡片 ===
await page.locator('#toolbox').scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.locator('#toolbox').screenshot({ path: resolve(SHOTS_DIR, 'toolbox-default.png') });
console.log('✓ toolbox-default.png');

// hover 在第一張 tool-card
const firstCard = page.locator('#toolbox .tool-card').first();
await firstCard.hover();
await page.waitForTimeout(400);
await page.locator('#toolbox').screenshot({ path: resolve(SHOTS_DIR, 'toolbox-hover-card.png') });
console.log('✓ toolbox-hover-card.png');

// hover 在 Day 2 chip
const day2Chip = page.locator('.toolbox-filters .chip', { hasText: 'Day 2' });
await day2Chip.hover();
await page.waitForTimeout(300);
await page.locator('.toolbox-filters').screenshot({ path: resolve(SHOTS_DIR, 'toolbox-chip-hover.png') });
console.log('✓ toolbox-chip-hover.png');

// === Day hero 動畫：reload 並在動畫播放前截圖（已過動畫期，會看到 final state） ===
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.day-hero');
// 滾到 day1 區段觀察進場動畫
await page.locator('#day1').scrollIntoViewIfNeeded();
await page.waitForTimeout(900); // 等動畫播完
await page.locator('#day1 .day-hero').screenshot({ path: resolve(SHOTS_DIR, 'day1-hero-after-anim.png') });
console.log('✓ day1-hero-after-anim.png');

// hover 在 day-hero 看數字色彩變化
await page.locator('#day1 .day-hero').hover();
await page.waitForTimeout(400);
await page.locator('#day1 .day-hero').screenshot({ path: resolve(SHOTS_DIR, 'day1-hero-hover.png') });
console.log('✓ day1-hero-hover.png');

await browser.close();
console.log('\n全部存到：', SHOTS_DIR);
