#!/usr/bin/env node
// 工作坊電子書建構入口
// 用法：
//   npm run build:ebook                 # 產 dist/工作坊電子書.pdf
//   npm run build:ebook -- --md-only    # 只產 markdown（debug）
//   npm run build:ebook -- --output xxx # 自訂輸出路徑
//   npm run build:ebook -- --keep-html  # 保留中間 HTML（debug）
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import {
  loadSources,
  composeCover, composeOverview, composeDay,
  composeAppendixA, composeAppendixB, composeAppendixC,
  composeAppendixE, composeAppendixF,
} from './lib/compose-ebook.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * 解析 CLI flags
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const args = { mdOnly: false, output: null, keepHtml: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--md-only') args.mdOnly = true;
    else if (a === '--keep-html') args.keepHtml = true;
    else if (a === '--output') args.output = argv[++i];
  }
  return args;
}

/**
 * 主流程：load → compose → write md → (optional) render PDF
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const t0 = Date.now();

  console.log('[ebook] 載入資料源...');
  const s = await loadSources();
  console.log(`[ebook]   COURSE: 4 days, ${s.COURSE.quiz.length} quiz, ${s.COURSE.materials.length} materials`);
  console.log(`[ebook]   INSTRUCTOR: ${s.INSTRUCTOR?.recentVideos?.length || 0} videos`);
  console.log(`[ebook]   TOOLS: ${s.TOOLS?.length || 0} tools`);
  console.log(`[ebook]   AUX materials: ${s.auxMaterials.length} files`);

  console.log('[ebook] 組稿 markdown...');
  const sections = [];
  sections.push(composeCover(s));
  sections.push(await composeOverview(s));
  sections.push(await composeDay(s.COURSE.day1, s.dayContents.day1, 1));
  sections.push(await composeDay(s.COURSE.day2, s.dayContents.day2, 2));
  sections.push(await composeDay(s.COURSE.day3, s.dayContents.day3, 3));
  sections.push(await composeDay(s.COURSE.day4, s.dayContents.day4, 4));
  // 測驗章節（第 5 章與附錄 D）已從電子書移除，依照需求改由網頁端進行
  sections.push(composeAppendixA(s.COURSE.materials));
  sections.push(composeAppendixB(s.auxMaterials));
  sections.push(await composeAppendixC(s.COURSE.materials));
  sections.push(await composeAppendixE(s.TOOLS));
  sections.push(await composeAppendixF(s.INSTRUCTOR));

  const md = sections.join('\n\n');

  // 寫 master markdown
  const distDir = path.join(ROOT, 'dist');
  await fs.mkdir(distDir, { recursive: true });
  const mdPath = path.join(distDir, '工作坊電子書.md');
  await fs.writeFile(mdPath, md, 'utf8');
  console.log(`[ebook] 已產出 ${mdPath}（${(md.length / 1024).toFixed(1)} KB）`);

  if (args.mdOnly) {
    console.log(`[ebook] --md-only 模式，跳過 PDF 渲染（耗時 ${((Date.now() - t0) / 1000).toFixed(1)}s）`);
    return;
  }

  // PDF 渲染
  const { renderPdf } = await import('./lib/render-pdf.mjs');
  const outPath = args.output ? path.resolve(args.output) : path.join(distDir, '工作坊電子書.pdf');
  const cssPath = path.join(ROOT, '完整課程包', '教學素材', '_build', 'style-ebook.css');
  await renderPdf({ mdPath, cssPath, outPath, keepHtml: args.keepHtml });
  console.log(`[ebook] 已產出 ${outPath}（耗時 ${((Date.now() - t0) / 1000).toFixed(1)}s）`);
}

main().catch(e => {
  console.error('[ebook] 失敗：', e.message);
  console.error(e.stack);
  process.exit(1);
});
