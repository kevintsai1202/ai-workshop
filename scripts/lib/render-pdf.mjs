// pandoc + playwright（chromium）→ PDF
// 參考 完整課程包/教學素材/_build/build-pdf.ps1：把 CSS 內嵌到 HTML 模板，
// 避免 file:// 載入外部 CSS 的相容性問題
//
// 為什麼從 Edge headless CLI 切換到 playwright：
// - Chromium 印 PDF 模式下，CSS Paged Media 的 @page margin boxes（如 @bottom-center）
//   不支援 content 屬性，無法用 CSS 加頁碼。
// - --print-to-pdf-header-template / --footer-template 這些 CLI flag 不存在；
//   只能透過 Chrome DevTools Protocol 的 Page.printToPDF（playwright 的 page.pdf()）傳。
// - playwright 模組專案已裝（devDependencies），改用它即可獲得 footerTemplate 支援。
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { chromium } from 'playwright';

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

    // 2. playwright headless chromium: html → pdf（含頁碼 footerTemplate）
    console.log('[render-pdf] playwright → PDF');
    const browserPath = await findBrowser();
    // file:// URL：absolute path、forward slashes、空格 encode
    const fileUrl = 'file:///' + path.resolve(htmlPath).replace(/\\/g, '/').replace(/ /g, '%20');

    // 嘗試使用系統 Edge/Chrome（避免 playwright 自帶的 chromium 沒下載）
    // 失敗時 fallback 到 playwright 自帶 chromium
    let browser;
    try {
      browser = await chromium.launch(browserPath ? { executablePath: browserPath } : {});
    } catch (e) {
      console.log(`[render-pdf]   系統瀏覽器啟動失敗（${e.message.slice(0, 60)}），改用 playwright 內建 chromium`);
      browser = await chromium.launch();
    }

    try {
      const page = await browser.newPage();
      await page.goto(fileUrl, { waitUntil: 'networkidle' });
      // 給 base64 SVG 與相對路徑 PNG 圖片足夠的繪製時間
      await page.waitForTimeout(1500);

      // footer：書名（左）+ 頁碼/總頁數（右）；class="pageNumber" / "totalPages" 由 Chromium 自動填入
      // 注意：footerTemplate / headerTemplate 內的 CSS 必須 inline（沒有外部 stylesheet）
      const footerTemplate = `
<div style="font-size:8pt;width:100%;padding:0 16mm;color:#8a90a0;font-family:'PingFang TC','Microsoft JhengHei','Noto Sans TC',sans-serif;display:flex;justify-content:space-between;align-items:center;">
  <span style="font-weight:600;letter-spacing:0.05em;">行政與財務 AI 自動化　工作坊電子書</span>
  <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>`;
      // header 留空（避免 Chromium 在最頂繪製日期/網址等預設文字）
      const headerTemplate = `<div></div>`;

      await page.pdf({
        path: path.resolve(outPath),
        format: 'A4',
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
        printBackground: true,
        preferCSSPageSize: true,   // 讓 CSS @page 規則優先（封面 :first { margin: 0 } 會接管，footer 在該頁不繪製）
        tagged: true,              // tagged PDF：讓閱讀器自動建立 outline / bookmarks
      });
    } finally {
      await browser.close();
    }

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
