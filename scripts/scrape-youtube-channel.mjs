// =============================================================================
// 擷取 YouTube 頻道資訊腳本（Playwright）
// 用途：抓取講師 @pg-kt 的頻道名稱、訂閱數、簡介、最熱門影片清單，
//       輸出至 data/instructor.json，供 index.html 的講師卡片使用。
// 設計原則（依 CLAUDE.md）：
//   1) 可重跑：純粹由 URL 驅動，每次執行覆寫 JSON 與截圖
//   2) 可逐行除錯：分階段在 console 印出進度與抓到的欄位
//   3) 不依賴外部 API key：只用公開頁面 + Playwright 瀏覽器自動化
// =============================================================================

import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(ROOT, 'data');

// 目標頻道 — 修改這裡即可換頻道
const CHANNEL_HANDLE = '@pg-kt';
const BASE_URL = `https://www.youtube.com/${CHANNEL_HANDLE}`;

/**
 * 處理 YouTube Cookies 同意對話框（歐盟 GDPR 規範下會在全球出現）
 * 找到「拒絕全部」或「全部接受」按鈕並點擊，才能進到頻道頁
 */
async function dismissCookieConsent(page) {
  try {
    // 多語系 fallback：英文、繁中、簡中常見按鈕文字
    const buttonTexts = ['Reject all', 'Accept all', '全部拒絕', '全部接受', '拒絕全部', '接受全部'];
    for (const text of buttonTexts) {
      const btn = page.locator(`button:has-text("${text}")`).first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.click();
        console.log(`  ✓ 已關閉 Cookies 對話框（${text}）`);
        await page.waitForTimeout(800);
        return;
      }
    }
  } catch {
    // 沒看到對話框就直接略過 — 某些網域不會跳
  }
}

/**
 * 抓取頻道主頁的核心資訊（名稱、handle、訂閱數、簡介、頻道頭像 URL）
 */
async function scrapeChannelHeader(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissCookieConsent(page);

  // 改用 networkidle 等資料載完，比 selector race 穩定
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  // 確保 page header 有渲染（YouTube 新版用 yt-page-header-renderer 包整個頂部資訊）
  await page
    .waitForSelector('yt-page-header-renderer, #page-header, ytd-c4-tabbed-header-renderer', { timeout: 20000 })
    .catch(() => console.log('  ⚠ page-header selector 逾時，繼續嘗試從 meta 抓'));

  // 在瀏覽器 context 裡跑抽取邏輯，避免在 Node 端做多次 selector race
  const data = await page.evaluate(() => {
    /** 安全取文字 */
    const text = (sel, root = document) => root.querySelector(sel)?.textContent?.trim() || null;
    /** 安全取屬性 */
    const attr = (sel, name, root = document) => root.querySelector(sel)?.getAttribute(name) || null;

    // 限定在 page header 內找元素，避免命中影片區的 ytd-channel-name
    const header =
      document.querySelector('yt-page-header-renderer') ||
      document.querySelector('#page-header') ||
      document.querySelector('ytd-c4-tabbed-header-renderer') ||
      document;

    /** 從 metadata view-model 的 span 群裡找符合 regex 的文字 */
    const findInMetadata = (regex) =>
      Array.from(header.querySelectorAll('yt-content-metadata-view-model span, #channel-header-container span'))
        .map((s) => s.textContent.trim())
        .find((t) => regex.test(t)) || null;

    return {
      name:
        text('yt-dynamic-text-view-model h1', header) ||
        text('h1', header) ||
        text('meta[property="og:title"]'),
      handle: findInMetadata(/^@/),
      subscriberCount: findInMetadata(/訂閱者|subscriber/i),
      videoCount: findInMetadata(/影片|video/i),
      avatar:
        attr('yt-decorated-avatar-view-model img', 'src', header) ||
        attr('img', 'src', header.querySelector('yt-decorated-avatar-view-model') || header) ||
        attr('meta[property="og:image"]', 'content'),
      banner:
        attr('yt-image-banner-view-model img', 'src', header) ||
        attr('.page-header-banner-image', 'src', header),
      description:
        text('yt-description-preview-view-model', header) ||
        text('#description-container yt-attributed-string', header) ||
        text('meta[property="og:description"]') ||
        text('meta[name="description"]'),
      url: location.href,
    };
  });

  return data;
}

/**
 * 從 YouTube 影片 URL 解析 videoId（11 字元）
 * 例：https://www.youtube.com/watch?v=ABC123XYZ_8&pp=tracking → ABC123XYZ_8
 * @returns {string|null}
 */
function extractVideoId(url) {
  if (!url) return null;
  const m = String(url).match(/[?&]v=([\w-]{11})/);
  return m ? m[1] : null;
}

/**
 * 由 videoId 拼出 YouTube 官方縮圖 URL
 * hqdefault (480×360) 是所有影片都有的最穩規格；maxresdefault 不一定存在。
 */
function thumbnailFromVideoId(videoId) {
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

/**
 * 解析中文/英文觀看數字串為數值
 * 支援格式：「觀看次數：2,245次」、「2.2萬次」、「1.5 萬」、「2.3K views」、「1.2M」
 * @param {string|null} raw 觀看次數原始字串
 * @returns {number} 解析後的整數；無法解析回傳 0
 */
function parseViews(raw) {
  if (!raw) return 0;
  const s = String(raw).replace(/觀看次數[：:]?/g, '').replace(/views?/gi, '').trim();
  // 中文單位：萬 = 1e4, 億 = 1e8
  const cn = s.match(/([\d.]+)\s*([萬億])/);
  if (cn) {
    const n = parseFloat(cn[1]);
    const unit = cn[2] === '萬' ? 1e4 : 1e8;
    return Math.round(n * unit);
  }
  // 英文單位：K = 1e3, M = 1e6, B = 1e9
  const en = s.match(/([\d.]+)\s*([KMB])/i);
  if (en) {
    const n = parseFloat(en[1]);
    const unit = { K: 1e3, M: 1e6, B: 1e9 }[en[2].toUpperCase()];
    return Math.round(n * unit);
  }
  // 純數字（可能含逗號或「次」），例如「2,245次」、「459次」
  const num = s.replace(/[,，\s次]/g, '').match(/\d+/);
  return num ? parseInt(num[0], 10) : 0;
}

/**
 * 抓取頻道最熱門 N 部影片（依觀看數由高到低；標題 / 連結 / 縮圖 / 觀看數）
 *
 * 策略說明：
 *   YouTube SPA 會 strip 掉 `?view=0&sort=p` 排序參數（直接導航 URL 也沒用），
 *   點擊頁面上的 sort chip 又因為 chip 是動態渲染、選擇器易變，穩定性差。
 *   折衷做法：抓最近的 SAMPLE_SIZE 部影片（約 30 部，遠超平均熱門尾部），
 *   解析觀看數後在本地端排序，取前 limit 部當作「熱門」。
 *   這對「117 部影片」量級的頻道夠精準，且不需要 API key。
 *
 * @param {number} limit 最終取前幾部，預設 6
 */
async function scrapePopularVideos(page, limit = 6) {
  // 取樣池大小：愈大愈接近全頻道熱門排序，但 scroll 時間也愈久
  const SAMPLE_SIZE = 30;

  await page.goto(`${BASE_URL}/videos`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissCookieConsent(page);

  // 等影片格子出現
  await page
    .waitForSelector('ytd-rich-item-renderer, ytd-grid-video-renderer', { timeout: 30000 })
    .catch(() => console.log('  ⚠ 影片清單選擇器逾時，可能頻道無公開影片'));

  // 滾動載入更多影片，直到湊滿 SAMPLE_SIZE 或停止增加
  let prev = 0;
  for (let i = 0; i < 12; i++) {
    const count = await page.evaluate(() => document.querySelectorAll('ytd-rich-item-renderer').length);
    if (count >= SAMPLE_SIZE) break;
    if (count === prev && i > 1) break; // 連續兩輪沒增加 → 已到底
    prev = count;
    await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
    await page.waitForTimeout(900);
  }

  // 多停 1.2 秒讓最後一批 lazy-load 的觀看數 span 渲染完成
  await page.waitForTimeout(1200);

  // 在瀏覽器端抽取所有候選影片
  const candidates = await page.evaluate((sampleSize) => {
    const cards = Array.from(document.querySelectorAll('ytd-rich-item-renderer')).slice(0, sampleSize);
    return cards.map((card) => {
      const titleEl = card.querySelector('#video-title, a.yt-lockup-metadata-view-model-wiz__title, h3 a');
      const thumbEl = card.querySelector('img');
      const viewsEl = Array.from(card.querySelectorAll('span'))
        .map((s) => s.textContent.trim())
        .find((t) => /觀看|view/i.test(t));
      const href = titleEl?.getAttribute('href') || titleEl?.querySelector('a')?.getAttribute('href');
      return {
        title: titleEl?.textContent?.trim() || titleEl?.getAttribute('title') || null,
        url: href ? new URL(href, 'https://www.youtube.com').href : null,
        thumbnail: thumbEl?.getAttribute('src') || null,
        views: viewsEl || null,
      };
    }).filter(v => v.url); // 排除沒有 URL 的（廣告/異常卡片）
  }, SAMPLE_SIZE);

  // 在 Node 端解析觀看數並補上縮圖（YouTube virtual scrolling 會釋放捲出視野卡片的 <img src>，
  // 這裡用 videoId 直接拼官方 thumbnail URL 當 fallback，比依賴頁面 src 穩定）
  const ranked = candidates
    .map((v) => {
      const videoId = extractVideoId(v.url);
      return {
        ...v,
        thumbnail: v.thumbnail || thumbnailFromVideoId(videoId),
        viewsCount: parseViews(v.views),
      };
    })
    .sort((a, b) => b.viewsCount - a.viewsCount)
    .slice(0, limit);

  console.log(`  → 取樣池 ${candidates.length} 部，依觀看數排序後取前 ${ranked.length} 部`);
  return ranked;
}

/**
 * 主流程
 */
async function main() {
  console.log(`\n🎬 開始擷取 YouTube 頻道：${BASE_URL}\n`);
  await mkdir(DATA_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'zh-TW',
    viewport: { width: 1366, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    console.log('📌 [1/3] 抓取頻道主頁資訊...');
    const header = await scrapeChannelHeader(page);
    // 清理 description：YouTube 的「顯示更多」展開機制會讓 textContent 重複，
    // 取「…顯示更多」之前的第一段做為正式描述
    if (header.description) {
      header.description = header.description.split(/…?\s*顯示更多|\.\.\.more/i)[0].trim();
    }
    console.log('  →', JSON.stringify(header, null, 2));

    console.log('\n📌 [2/3] 抓取最熱門影片清單...');
    const videos = await scrapePopularVideos(page, 6);
    console.log(`  → 抓到 ${videos.length} 部影片`);
    videos.forEach((v, i) => console.log(`     ${i + 1}. ${v.title}`));

    console.log('\n📌 [3/3] 儲存頻道首頁截圖...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await dismissCookieConsent(page);
    const screenshotPath = resolve(DATA_DIR, 'instructor-channel.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`  → 已儲存：${screenshotPath}`);

    // 整合輸出
    const result = {
      source: BASE_URL,
      scrapedAt: new Date().toISOString(),
      channel: header,
      recentVideos: videos,
    };
    const jsonPath = resolve(DATA_DIR, 'instructor.json');
    await writeFile(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`  → 資料 JSON：${jsonPath}`);

    // 同步輸出 instructor-data.js 給 index.html 用 <script src> 載入
    // 這樣使用者雙擊 index.html（file://）也能讀到資料，不必啟動本地伺服器
    const jsPath = resolve(ROOT, 'instructor-data.js');
    const jsContent = `// 由 scripts/scrape-youtube-channel.mjs 自動產生，請勿手動編輯\n// 重跑：npm run scrape:instructor\nwindow.INSTRUCTOR = ${JSON.stringify(result, null, 2)};\n`;
    await writeFile(jsPath, jsContent, 'utf-8');
    console.log(`  → 注入用 JS：${jsPath}`);
    console.log(`\n✅ 完成！\n`);
  } catch (err) {
    console.error('\n❌ 擷取失敗：', err.message);
    // 失敗截圖以利除錯
    await page.screenshot({ path: resolve(DATA_DIR, 'error-snapshot.png'), fullPage: true }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
