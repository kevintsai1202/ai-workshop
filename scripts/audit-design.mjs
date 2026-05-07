// 設計感稽核：拍各關鍵區段截圖供肉眼複核
// 目的：上傳 PNG 後，全面檢視整體視覺一致性與資訊節奏
// 執行：URL=http://localhost:3000/ node scripts/audit-design.mjs
// 輸出：data/design-audit/*.png

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SHOTS_DIR = resolve(ROOT, 'data', 'design-audit');

const URL = process.env.URL || 'http://localhost:3000/';

await mkdir(SHOTS_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'zh-TW',
  deviceScaleFactor: 2, // 高 DPI 截圖
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('.day-hero', { timeout: 10000 });

// 展開全部 details 並把所有 illustration 強制 eager（避免 lazy 影響截圖）
await page.evaluate(() => {
  document.querySelectorAll('details').forEach(d => d.open = true);
  document.querySelectorAll('.illustration img').forEach(img => {
    img.loading = 'eager';
    const s = img.src; img.src = ''; img.src = s;
  });
});
await page.waitForTimeout(800);

// 等所有圖載入
await page.evaluate(async () => {
  const imgs = Array.from(document.images);
  await Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth) return Promise.resolve();
    return new Promise(resolve => {
      const done = () => { clearTimeout(t); resolve(); };
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      const t = setTimeout(done, 4000);
    });
  }));
});

// 拍各關鍵點：先用 selector 截 section、再附整頁長截圖
const targets = [
  { name: '01-topbar+overview',     selector: '#overview',           desc: '頂部 + 工作坊總覽 + 講師卡' },
  { name: '02-shared-case',         selector: '#shared-case',        desc: '共用案例（角色卡 + 共用工具集 含 Flow）' },
  { name: '03-day1-models-vs-tools',selector: '#day1-u1',            desc: 'Day 1 unit 1 含 PNG 插圖（模型 vs 工具）' },
  { name: '04-day2-image-to-video', selector: '#day2-u1',            desc: 'Day 2 unit 1 含 PNG 插圖（影片三步驟）— illustration 在 unit 1 最後 concept' },
  { name: '05-day3-invoice-excel',  selector: '#day3-u2',            desc: 'Day 3 unit 2 含 PNG 插圖（發票轉 Excel）' },
  { name: '06-day4-skill',          selector: '#day4-u1',            desc: 'Day 4 unit 1 含 PNG 插圖（Skill 封裝）' },
  { name: '07-materials-overview',  selector: '#materials-overview', desc: '教學素材總覽（PNG banner）' },
  { name: '08-toolbox',             selector: '#toolbox',            desc: '工具圖鑑（含 Flow 卡片）' },
];

for (const t of targets) {
  try {
    const loc = page.locator(t.selector).first();
    await loc.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const path = resolve(SHOTS_DIR, `${t.name}.png`);
    await loc.screenshot({ path });
    console.log(`✓ ${t.name} — ${t.desc}`);
  } catch (err) {
    console.log(`✗ ${t.name} — ${err.message}`);
  }
}

// 整頁長截圖（資訊流節奏）
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
const fullPath = resolve(SHOTS_DIR, '00-full-page.png');
await page.screenshot({ path: fullPath, fullPage: true });
console.log(`✓ 00-full-page.png — 整頁長截圖`);

await browser.close();
console.log(`\n全部存到：${SHOTS_DIR}`);
