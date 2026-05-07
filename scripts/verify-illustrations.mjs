// =============================================================================
// 驗證腳本：檢查 assets/illustrations/*.svg 在頁面上正確載入並渲染
// 涵蓋：
//   1. 每個 .illustration img 的 naturalWidth > 0（圖檔成功讀取）
//   2. 沒有任何 .illustration 容器被 onerror handler 隱藏
//   3. 截圖每個含 illustration 的章節 → data/illustrations-*.png
// 執行：URL=http://localhost:3000/ node scripts/verify-illustrations.mjs
// =============================================================================

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SHOTS_DIR = resolve(ROOT, 'data');

const URL = process.env.URL || 'http://localhost:3000/';

async function main() {
  await mkdir(SHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    locale: 'zh-TW',
  }).then(c => c.newPage());

  const failed404 = [];
  page.on('response', resp => {
    if (resp.status() >= 400 && resp.url().includes('/illustrations/')) {
      failed404.push(`${resp.status()} ${resp.url()}`);
    }
  });

  console.log(`🌐 開啟 ${URL}`);
  // 用 domcontentloaded 比 networkidle 穩定（避免有長連線時卡住）
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('  ✓ goto done');
  await page.waitForSelector('.day-hero', { timeout: 10000 });
  console.log('  ✓ .day-hero rendered');

  // 展開所有 details 確保隱藏節點也載入
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
  await page.waitForTimeout(300);

  // 強制把所有 .illustration img 改成 eager 並重新指派 src，跳過 lazy loading
  // （驗證時要確保所有圖檔載入；production 仍用 lazy 節省頻寬）
  await page.evaluate(() => {
    document.querySelectorAll('.illustration img').forEach(img => {
      img.loading = 'eager';
      const src = img.src;
      img.src = '';
      img.src = src;
    });
  });

  // 等所有 .illustration img 真的 complete（含 lazy 觸發後）
  // 每張圖最多等 5 秒，避免 lazy 沒觸發時無限等待
  await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll('.illustration img'));
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return new Promise(resolve => {
        const done = () => { clearTimeout(t); resolve(); };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        const t = setTimeout(done, 5000); // 強制 5 秒上限
      });
    }));
  });

  // 收集每個 .illustration 的狀態
  const facts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.illustration')).map(box => {
      const img = box.querySelector('img');
      const visible = box.style.display !== 'none' && getComputedStyle(box).display !== 'none';
      return {
        variant: Array.from(box.classList).find(c => c.startsWith('illustration--')) || '(none)',
        src: img?.getAttribute('src'),
        alt: img?.getAttribute('alt'),
        naturalWidth: img?.naturalWidth ?? 0,
        complete: img?.complete ?? false,
        visible,
        section: box.closest('section.chapter')?.id ?? '(no-section)',
      };
    });
  });

  console.log('\n📊 .illustration 狀態：');
  console.log(JSON.stringify(facts, null, 2));

  // 為每個有 illustration 的章節截圖
  const sectionsWithIllust = [...new Set(facts.map(f => f.section))].filter(s => s !== '(no-section)');
  for (const sid of sectionsWithIllust) {
    try {
      const loc = page.locator(`[id="${sid}"]`).first();
      const path = resolve(SHOTS_DIR, `illustrations-${sid}.png`);
      await loc.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await loc.screenshot({ path });
      console.log(`  ✓ 截圖：${path}`);
    } catch (err) {
      console.log(`  ⚠ 截圖失敗 ${sid}: ${err.message}`);
    }
  }

  await browser.close();

  const failures = [];
  facts.forEach(f => {
    if (!f.naturalWidth) failures.push(`圖檔載入失敗：${f.src}`);
    if (!f.visible) failures.push(`容器被隱藏（onerror 觸發？）：${f.src}`);
  });
  if (failed404.length) failures.push(...failed404.map(f => `4xx 回應：${f}`));

  if (failures.length) {
    console.log('\n❌ 失敗：');
    failures.forEach(f => console.log('  - ' + f));
    process.exit(2);
  }
  console.log(`\n✅ 共 ${facts.length} 張 illustration 全部成功載入`);
}

main().catch(err => { console.error('❌', err); process.exit(1); });
