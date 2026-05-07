// 驗證 viewer.html 能正確渲染 .md / .csv / .yaml 三種類型
// 對每種類型：開啟 viewer + file=... → 等內容載入 → 截圖 + 抓出渲染後 DOM 結構檢查
// 執行：URL=http://localhost:3000/ node scripts/verify-viewer.mjs

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOTS_DIR = resolve(__dirname, '..', 'data', 'design-audit');
await mkdir(SHOTS_DIR, { recursive: true });

const BASE = process.env.URL || 'http://localhost:3000/';
const cases = [
  {
    name: 'md',
    file: '完整課程包/教學素材/品牌調性指南.md',
    expectSelector: '.md-content h1, .md-content h2',
    description: 'Markdown — 應有 h1/h2 渲染'
  },
  {
    name: 'csv',
    file: '完整課程包/教學素材/亂格式請購單.csv',
    expectSelector: '.csv-table thead th',
    description: 'CSV — 應有表格 thead'
  },
  {
    name: 'yaml',
    file: '完整課程包/教學素材/發票自動整理_Skill範本.yaml',
    expectSelector: 'pre.raw-content',
    description: 'YAML — 應有 raw-content pre'
  }
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-TW', deviceScaleFactor: 2 });
const page = await ctx.newPage();

const failures = [];
for (const c of cases) {
  const url = `${BASE}viewer.html?file=${encodeURIComponent(c.file)}`;
  console.log(`\n→ ${c.name}: ${c.description}`);
  console.log(`  ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(800);

  const found = await page.evaluate((sel) => !!document.querySelector(sel), c.expectSelector);
  const filenameDisplay = await page.evaluate(() => document.querySelector('#filename')?.textContent);
  const dlHref = await page.evaluate(() => document.querySelector('#download-btn')?.getAttribute('href'));
  const copyExists = await page.evaluate(() => !!document.querySelector('#copy-btn'));

  console.log(`  filename:  ${filenameDisplay}`);
  console.log(`  expectSel: ${found ? '✓' : '✗'} (${c.expectSelector})`);
  console.log(`  copy btn:  ${copyExists ? '✓' : '✗'}`);
  console.log(`  download:  ${dlHref}`);

  await page.screenshot({ path: resolve(SHOTS_DIR, `viewer-${c.name}.png`), fullPage: false });

  if (!found) failures.push(`${c.name}: ${c.expectSelector} not found`);
  if (!copyExists) failures.push(`${c.name}: copy button missing`);
  if (!dlHref || !dlHref.includes(c.file.split('/').pop())) failures.push(`${c.name}: download href incorrect`);
}

await browser.close();

if (failures.length) {
  console.log('\n❌ 失敗項目：');
  failures.forEach(f => console.log('  - ' + f));
  process.exit(2);
}
console.log('\n✅ viewer 三種類型全部渲染正確');
