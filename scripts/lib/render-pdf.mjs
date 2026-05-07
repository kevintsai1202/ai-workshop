// pandoc + Edge headless → PDF
// 參考 完整課程包/教學素材/_build/build-pdf.ps1：把 CSS 內嵌到 HTML 模板，
// 避免 file:// 載入外部 CSS 的相容性問題
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/**
 * 把 markdown 轉成 PDF
 * @param {object} opts
 * @param {string} opts.mdPath   - master markdown 路徑
 * @param {string} opts.cssPath  - print CSS 路徑
 * @param {string} opts.outPath  - 輸出 PDF 路徑
 * @param {boolean} [opts.keepHtml] - 是否保留中間 HTML（debug 用）
 */
export async function renderPdf({ mdPath, cssPath, outPath, keepHtml = false }) {
  const htmlPath = outPath.replace(/\.pdf$/i, '.html');
  const cssContent = await fs.readFile(cssPath, 'utf8');

  // HTML 模板：包含精簡 inline TOC（只列 h1）；
  // 同時 Edge headless 加 --export-tagged-pdf 會產生 tagged PDF，
  // 多數 PDF 閱讀器（Adobe Reader / Edge / Chrome PDF viewer）會從結構樹推導出側邊書籤
  const tpl = `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="UTF-8">
<title>$title$</title>
<style>
$styles$
</style>
</head>
<body>
$if(toc)$
<nav id="TOC" role="doc-toc">
<h2>目錄</h2>
$table-of-contents$
</nav>
$endif$
$body$
</body>
</html>
`;
  const tplPath = path.join(os.tmpdir(), `ebook-template-${process.pid}.html`);
  await fs.writeFile(tplPath, tpl, 'utf8');

  try {
    // 1. pandoc: md → html（CSS 內嵌、含 TOC）
    console.log('[render-pdf] pandoc → HTML');
    await runCmd('pandoc', [
      mdPath,
      '-f', 'gfm+attributes',          // GFM + 支援 {.cover} 這類 attribute
      '-t', 'html5',
      '-s',
      // 精簡 TOC：只列 h1 章節（11 條 entries 約佔 1 頁），
      // 比原 toc-depth=3 的數百條短得多。對多數 PDF 閱讀器，
      // 加上 --export-tagged-pdf 後側邊書籤面板還會自動展開。
      '--toc', '--toc-depth=1',
      '--metadata', 'title=工作坊電子書',
      '--variable', `styles:${cssContent}`,
      '--template', tplPath,
      '-o', htmlPath,
    ]);

    // 2. Edge headless: html → pdf
    console.log('[render-pdf] Edge headless → PDF');
    const browser = await findBrowser();
    if (!browser) {
      throw new Error('找不到 Microsoft Edge 或 Google Chrome：請安裝其一');
    }

    // file:// URL：absolute path、forward slashes、空格 encode
    const fileUrl = 'file:///' + path.resolve(htmlPath).replace(/\\/g, '/').replace(/ /g, '%20');

    await runCmd(browser, [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      // 等所有 compositor stages 完成（base64 圖片需要這個才會被印進 PDF）
      '--run-all-compositor-stages-before-draw',
      // 給 base64 解碼足夠時間（單位 ms），對含 26+ 個 base64 PNG 的長文有用
      '--virtual-time-budget=15000',
      // 產 tagged PDF：讓 PDF 閱讀器側邊欄能從 h1/h2/h3 自動建立目錄樹（PDF outline / bookmarks）
      '--export-tagged-pdf',
      `--print-to-pdf=${path.resolve(outPath)}`,
      '--print-to-pdf-no-header',
      fileUrl,
    ], { silent: true });

    // 驗證 PDF 產出
    try {
      const stat = await fs.stat(outPath);
      console.log(`[render-pdf] PDF 大小：${(stat.size / 1024 / 1024).toFixed(2)} MB`);
    } catch {
      throw new Error(`PDF 未產生：${outPath}`);
    }
  } finally {
    // 清理模板
    await fs.unlink(tplPath).catch(() => {});
    if (!keepHtml) {
      await fs.unlink(htmlPath).catch(() => {});
    }
  }
}

/**
 * 在常見路徑找 Edge 或 Chrome（Windows）
 */
async function findBrowser() {
  const candidates = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];
  for (const c of candidates) {
    try {
      await fs.access(c);
      return c;
    } catch {
      // 略過
    }
  }
  return null;
}

/**
 * 跑外部指令、stdio 預設 inherit（顯示輸出）；silent 模式則丟掉 stdout/stderr
 */
function runCmd(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const stdio = opts.silent ? ['ignore', 'ignore', 'ignore'] : 'inherit';
    const child = spawn(cmd, args, { stdio, shell: false });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(cmd)} exited with code ${code}`));
    });
  });
}
