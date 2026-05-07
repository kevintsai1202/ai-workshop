// =============================================================================
// 驗證腳本：確認對學員隱藏的區塊真的不出現在頁面上
// 涵蓋：
//   1. quiz 章節整章不渲染（#quiz 不存在）
//   2. sidebar 不出現「結訓測驗」連結
//   3. 「結訓條件」H3 + 完成要件清單不渲染
//   4. 全頁文字無「前測 / 後測 / 前後測」字眼
// 執行：URL=http://localhost:3000/ node scripts/verify-hidden-sections.mjs
// =============================================================================

import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:3000/';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-TW' }).then(c => c.newPage());

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('.day-hero', { timeout: 10000 });

  // 一次撈出所有檢查項目
  const result = await page.evaluate(() => {
    const sidebarTexts = Array.from(document.querySelectorAll('#nav .nav-link')).map(a => a.textContent.trim());
    const h3Texts = Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim());
    const fullText = document.body.innerText;
    return {
      hasQuizSection: !!document.querySelector('#quiz'),
      sidebarLinks: sidebarTexts,
      sidebarHasQuiz: sidebarTexts.some(t => t.includes('結訓測驗') || t.includes('Q')),
      h3Texts,
      hasCompletionH3: h3Texts.some(t => t.trim() === '結訓條件'),
      foundForbiddenWords: ['前測', '後測', '前後測'].filter(w => fullText.includes(w)),
    };
  });

  console.log('=== 隱藏驗證結果 ===');
  console.log(JSON.stringify(result, null, 2));

  const failures = [];
  if (result.hasQuizSection) failures.push('#quiz 章節仍存在於 DOM');
  if (result.sidebarHasQuiz) failures.push('Sidebar 仍有「結訓測驗」連結');
  if (result.hasCompletionH3) failures.push('「結訓條件」H3 仍渲染');
  if (result.foundForbiddenWords.length) failures.push(`頁面文字中仍出現：${result.foundForbiddenWords.join('、')}`);

  await browser.close();

  if (failures.length) {
    console.log('\n❌ 隱藏不完全：');
    failures.forEach(f => console.log('  - ' + f));
    process.exit(2);
  }
  console.log('\n✅ 全部隱藏項目均已生效');
}

main().catch(err => { console.error('❌', err); process.exit(1); });
