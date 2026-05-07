// =============================================================================
// 插圖機會稽核：掃過網站每個 section / 子區塊，找出「只有文字、沒有插圖」
// 的區段，當作未來請 Codex 補繪插圖的候選清單。
//
// 邏輯：
//   1. 對每個 .chapter 與其下的 .accordion-content / 表格區塊取樣
//   2. 統計文字長度、圖片數、列表/表格數
//   3. 文字密度高但沒有圖片 → 候選插圖位置
//
// 執行：URL=http://localhost:3000/ node scripts/audit-illustrations.mjs
// 輸出：data/illustration-audit.json + data/illustration-audit.md
//        + data/audit/section-*.png（每區段截圖供肉眼覆核）
// =============================================================================

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(ROOT, 'data');
const SHOTS_DIR = resolve(DATA_DIR, 'audit');

const URL = process.env.URL || 'http://localhost:3000/';

async function main() {
  await mkdir(SHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1600 },
    locale: 'zh-TW',
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log(`🌐 開啟 ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  // 確保所有章節都展開（accordion 預設可能折疊）
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach(d => { d.open = true; });
  });
  // 滾動全頁觸發 lazy 圖片
  await page.evaluate(async () => {
    await new Promise(r => {
      let y = 0;
      const step = () => {
        window.scrollTo(0, y);
        y += 600;
        if (y < document.body.scrollHeight) setTimeout(step, 50);
        else { window.scrollTo(0, 0); setTimeout(r, 300); }
      };
      step();
    });
  });
  await page.waitForTimeout(500);

  // 收集所有 chapter 區段 + Day 內 unit 子區塊
  const sections = await page.evaluate(() => {
    const result = [];

    // 1) 頂層 chapter
    document.querySelectorAll('section.chapter').forEach(ch => {
      const id = ch.id || '(no-id)';
      const heading = ch.querySelector('h2')?.textContent?.trim()
        || ch.querySelector('.day-hero-title')?.textContent?.trim()
        || '(no-heading)';
      const eyebrow = ch.querySelector('.eyebrow')?.textContent?.trim() || null;
      const text = ch.innerText || '';
      result.push({
        kind: 'chapter',
        id, heading, eyebrow,
        textLength: text.length,
        images: ch.querySelectorAll('img').length,
        svgs: ch.querySelectorAll('svg').length,
        tables: ch.querySelectorAll('table').length,
        ulList: ch.querySelectorAll('ul').length,
        h3s: Array.from(ch.querySelectorAll('h3')).map(h => h.textContent.trim()),
        approxHeightPx: Math.round(ch.getBoundingClientRect().height),
      });
    });

    // 2) Day 內每個 unit（details.unit）— 不重複統計父 chapter 內的圖
    document.querySelectorAll('details.unit').forEach(u => {
      const id = u.id || '(no-id)';
      const heading = u.querySelector('.unit-title')?.textContent?.trim() || '(no-heading)';
      const subtitle = u.querySelector('.unit-meta')?.textContent?.trim() || null;
      const body = u.querySelector('.unit-body');
      const text = body?.innerText || u.innerText || '';
      result.push({
        kind: 'unit',
        id, heading, eyebrow: subtitle,
        textLength: text.length,
        images: u.querySelectorAll('img').length,
        svgs: u.querySelectorAll('svg').length,
        tables: u.querySelectorAll('table').length,
        ulList: u.querySelectorAll('ul').length,
        h3s: Array.from(u.querySelectorAll('h4')).map(h => h.textContent.trim()).slice(0, 6),
        approxHeightPx: Math.round(u.getBoundingClientRect().height),
      });
    });

    return result;
  });

  // 為每個區段截圖（用 attribute selector 避免 CSS.escape 問題）
  console.log(`📸 為 ${sections.length} 個區段截圖中...`);
  for (const s of sections) {
    if (s.id === '(no-id)') continue;
    try {
      const loc = page.locator(`[id="${s.id.replace(/"/g, '\\"')}"]`).first();
      const path = resolve(SHOTS_DIR, `${s.kind}-${s.id}.png`);
      await loc.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
      await loc.screenshot({ path });
      s._screenshot = `data/audit/${s.kind}-${s.id}.png`;
    } catch (err) {
      s._screenshotError = err.message;
    }
  }

  // 加上「插圖密度」與分類標籤
  for (const s of sections) {
    // 插圖密度：每 1000 字幾張圖
    s.imagesPer1kChars = s.textLength
      ? +(s.images / (s.textLength / 1000)).toFixed(2)
      : 0;
    // 是否需要插圖：文字 > 600 字且整段沒有圖；或圖片密度 < 0.3
    s.needsIllustration = s.textLength > 600 && s.images === 0;
    s.lowDensity = !s.needsIllustration
      && s.textLength > 1500
      && s.imagesPer1kChars < 0.3;
  }

  // 排序：先無圖、再低密度
  const candidates = sections
    .filter(s => s.needsIllustration || s.lowDensity)
    .sort((a, b) => {
      if (a.needsIllustration !== b.needsIllustration) return a.needsIllustration ? -1 : 1;
      return b.textLength - a.textLength;
    });

  // 輸出 JSON
  const jsonPath = resolve(DATA_DIR, 'illustration-audit.json');
  await writeFile(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), url: URL, sections, candidates }, null, 2), 'utf-8');
  console.log(`  ✓ ${jsonPath}`);

  // 輸出 Markdown 報告
  const md = [];
  md.push(`# 插圖機會稽核報告\n`);
  md.push(`- 來源：${URL}`);
  md.push(`- 產生時間：${new Date().toLocaleString('zh-TW')}`);
  md.push(`- 共偵測 ${sections.length} 個區段（章節 + 單元），**${candidates.length} 個建議補插圖**\n`);

  md.push(`## 🎨 高優先：完全沒有插圖（textLength > 600）\n`);
  const high = candidates.filter(c => c.needsIllustration);
  if (high.length === 0) md.push('（無）\n');
  else {
    md.push('| # | 類型 | 區段 ID | 標題 | 字數 | 子標題 | 截圖 |');
    md.push('|---|------|---------|------|-----|--------|------|');
    high.forEach((s, i) => {
      const subs = s.h3s.slice(0, 3).join('、') || '—';
      const shot = s._screenshot ? `[查看](${s._screenshot})` : '—';
      md.push(`| ${i + 1} | ${s.kind} | \`${s.id}\` | ${s.heading} | ${s.textLength} | ${subs} | ${shot} |`);
    });
    md.push('');
  }

  md.push(`## 🖼 中優先：圖片密度偏低（每千字 < 0.3 張）\n`);
  const low = candidates.filter(c => c.lowDensity);
  if (low.length === 0) md.push('（無）\n');
  else {
    md.push('| # | 類型 | 區段 ID | 標題 | 字數 | 既有圖 | 密度 | 截圖 |');
    md.push('|---|------|---------|------|-----|-------|------|------|');
    low.forEach((s, i) => {
      const shot = s._screenshot ? `[查看](${s._screenshot})` : '—';
      md.push(`| ${i + 1} | ${s.kind} | \`${s.id}\` | ${s.heading} | ${s.textLength} | ${s.images} | ${s.imagesPer1kChars} | ${shot} |`);
    });
    md.push('');
  }

  md.push(`## 📋 全區段一覽\n`);
  md.push('| 類型 | 區段 ID | 標題 | 字數 | 圖 | SVG | 表 | 截圖 |');
  md.push('|------|---------|------|-----|---|-----|---|------|');
  sections.forEach(s => {
    const shot = s._screenshot ? `[查看](${s._screenshot})` : '—';
    md.push(`| ${s.kind} | \`${s.id}\` | ${s.heading} | ${s.textLength} | ${s.images} | ${s.svgs} | ${s.tables} | ${shot} |`);
  });

  const mdPath = resolve(DATA_DIR, 'illustration-audit.md');
  await writeFile(mdPath, md.join('\n'), 'utf-8');
  console.log(`  ✓ ${mdPath}`);

  await browser.close();

  console.log(`\n=== 摘要 ===`);
  console.log(`高優先（完全無圖）：${high.length} 區段`);
  console.log(`中優先（密度過低）：${low.length} 區段`);
}

main().catch(err => { console.error('❌', err); process.exit(1); });
