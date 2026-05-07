// 快速檢查：給定字串清單，確認頁面 body innerText 內全部不出現
// 執行：node scripts/check-text-absence.mjs "招生人數" "100 人"

import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:3000/';
const phrases = process.argv.slice(2);
if (!phrases.length) {
  console.error('Usage: node scripts/check-text-absence.mjs <phrase1> <phrase2> ...');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newContext({ locale: 'zh-TW' }).then(c => c.newPage());
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForSelector('.day-hero', { timeout: 8000 });
await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
const text = await page.evaluate(() => document.body.innerText);
await browser.close();

const found = phrases.filter(p => text.includes(p));
if (found.length) {
  console.log('❌ 仍出現：', found);
  process.exit(2);
}
console.log('✅ 全部不存在：', phrases);
