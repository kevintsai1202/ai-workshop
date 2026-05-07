// 驗證：捲到 details.unit 進入視窗中段時自動 open=true
// 流程：
//   1. 載入頁面，等首屏渲染完成
//   2. 確認首屏內某個 unit 已自動展開（IntersectionObserver 同步觸發）
//   3. 滾動到 day3-u2，等待 0.5s 看是否自動展開
//   4. 滾動到 day4-u2，重複驗證

import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:3000/';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-TW' });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.day-hero');

const targets = ['day1-u1', 'day1-u2', 'day1-u3', 'day2-u1', 'day3-u1', 'day3-u2', 'day4-u1', 'day4-u2'];

const results = [];
for (const id of targets) {
  // 跳到該 unit
  await page.evaluate((sid) => {
    const det = document.getElementById(sid);
    if (det) det.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, id);
  await page.waitForTimeout(600);
  const isOpen = await page.evaluate((sid) => {
    const det = document.getElementById(sid);
    return det ? det.open : null;
  }, id);
  results.push({ id, opened: isOpen });
  console.log(`  ${isOpen ? '✓' : '✗'} ${id} ${isOpen ? '已自動展開' : '未展開'}`);
}

await browser.close();

const allOpened = results.every(r => r.opened === true);
console.log(`\n${allOpened ? '✅' : '❌'} 共 ${results.length} 個 unit，自動展開：${results.filter(r => r.opened).length}/${results.length}`);
process.exit(allOpened ? 0 : 2);
