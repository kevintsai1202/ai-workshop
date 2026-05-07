// 驗證 Flow 工具出現在所有應該出現的位置
// 1. 工具圖鑑 (#toolbox) 內有 Flow 卡片
// 2. 共用工具集表（#shared-case 內的「共用工具集」表）有 Flow 列
// 3. Day 1 「為什麼要學多工具」表有 Flow 列
// 4. 模型 vs 工具表的工具舉例有提到 Flow
// 執行：URL=http://localhost:3000/ node scripts/verify-flow-coverage.mjs

import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:3000/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newContext({ locale: 'zh-TW' }).then(c => c.newPage());
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForSelector('.day-hero', { timeout: 8000 });
await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
await page.waitForTimeout(300);

const checks = await page.evaluate(() => {
  // (1) 工具圖鑑卡片名稱
  const toolboxNames = Array.from(document.querySelectorAll('#toolbox .tool-card .tool-name, #toolbox .tool-card h3'))
    .map(n => n.textContent.trim());
  const toolboxAllNames = Array.from(document.querySelectorAll('#toolbox .tool-card'))
    .map(c => c.textContent);

  // (2) 共用工具集表（在 shared-case 內、表頭含「出現天次」的）
  const sharedCaseToolsTable = Array.from(document.querySelectorAll('#shared-case table'))
    .find(t => Array.from(t.querySelectorAll('th')).some(th => th.textContent.includes('出現天次')));
  const sharedCaseRows = sharedCaseToolsTable
    ? Array.from(sharedCaseToolsTable.querySelectorAll('tbody tr')).map(r => r.textContent)
    : [];

  // (3) Day 1 「為什麼要學多工具」表 — 在 #day1 內、含「行政場景對應」的表
  const day1ToolsTable = Array.from(document.querySelectorAll('#day1 table'))
    .find(t => Array.from(t.querySelectorAll('th')).some(th => th.textContent.includes('行政場景對應')));
  const day1ToolRows = day1ToolsTable
    ? Array.from(day1ToolsTable.querySelectorAll('tbody tr')).map(r => r.textContent)
    : [];

  // (4) 模型 vs 工具表 — 表頭含「比喻」
  const modelVsToolsTable = Array.from(document.querySelectorAll('#day1 table'))
    .find(t => Array.from(t.querySelectorAll('th')).some(th => th.textContent.includes('比喻')));
  const modelVsToolsText = modelVsToolsTable ? modelVsToolsTable.textContent : '';

  return { toolboxAllNames, sharedCaseRows, day1ToolRows, modelVsToolsText };
});

await browser.close();

const failures = [];

if (!checks.toolboxAllNames.some(t => t.includes('Flow'))) {
  failures.push('工具圖鑑（#toolbox）找不到 Flow 卡片');
}
if (!checks.sharedCaseRows.some(r => r.includes('Flow'))) {
  failures.push('共用工具集表（shared-case）找不到 Flow 列');
}
if (!checks.day1ToolRows.some(r => r.includes('Flow'))) {
  failures.push('Day 1「為什麼要學多工具」表找不到 Flow 列');
}
if (!checks.modelVsToolsText.includes('Flow')) {
  failures.push('Day 1「模型 vs 工具」表的工具舉例沒提到 Flow');
}

console.log('=== Flow 出現位置驗證 ===');
console.log(`工具圖鑑卡片數：${checks.toolboxAllNames.length}（含 Flow：${checks.toolboxAllNames.some(t => t.includes('Flow'))}）`);
console.log(`共用工具集列數：${checks.sharedCaseRows.length}`);
console.log(`Day 1 多工具表列數：${checks.day1ToolRows.length}`);
console.log(`模型 vs 工具表含 "Flow"：${checks.modelVsToolsText.includes('Flow')}`);

if (failures.length) {
  console.log('\n❌ 缺漏：');
  failures.forEach(f => console.log('  - ' + f));
  process.exit(2);
}
console.log('\n✅ Flow 已出現在所有應該出現的位置');
