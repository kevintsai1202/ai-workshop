// 工作坊電子書 — 純函式組稿模組
// 每個 compose*() 都接收已 load 的資料、回傳 markdown string
// 沒有任何 I/O 副作用（loadSources / loadAuxMaterials / qrPng 例外，集中在最上方）
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import url from 'node:url';
import QRCode from 'qrcode';
import sharp from 'sharp';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
// 從 scripts/lib/ → 專案根目錄需跳兩層
const ROOT = path.resolve(__dirname, '..', '..');

/**
 * 載入所有電子書所需的資料源
 * - course-data.js / instructor-data.js / tools-data.js：用 vm 在 sandbox 執行，
 *   取出 window.COURSE / INSTRUCTOR / TOOLS
 * - 4 份 .md 課程文件（總覽、共用案例、Day1~4 課程內容）
 * - 11 份輔助素材（.md/.csv/.yaml）
 * 缺欄位即拋具名錯誤
 */
export async function loadSources() {
  const COURSE = await loadGlobalFromScript('course-data.js', 'COURSE');
  const INSTRUCTOR = await loadGlobalFromScript('instructor-data.js', 'INSTRUCTOR');
  const TOOLS = await loadGlobalFromScript('tools-data.js', 'TOOLS');

  // 讀 4 份 .md 課程內容文件
  const overview = await readMd('完整課程包/課程總覽.md');
  const sharedCase = await readMd('完整課程包/共用案例設定.md');
  const dayContents = {
    day1: await readMd('完整課程包/Day1_0513_產業趨勢與AI基礎入門/課程內容.md'),
    day2: await readMd('完整課程包/Day2_0520_AI多媒體內容製作/課程內容.md'),
    day3: await readMd('完整課程包/Day3_0527_行政文件與財務資料整理/課程內容.md'),
    day4: await readMd('完整課程包/Day4_0603_AI代理協作與成果展示/課程內容.md'),
  };

  // 11 份輔助素材全文
  const auxMaterials = await loadAuxMaterials();

  // 校驗 COURSE 必要欄位
  for (const k of ['day1', 'day2', 'day3', 'day4', 'materials', 'quiz', 'meta']) {
    if (!COURSE[k]) throw new Error(`Missing field: COURSE.${k}（請檢查 course-data.js）`);
  }

  return { COURSE, INSTRUCTOR, TOOLS, overview, sharedCase, dayContents, auxMaterials };
}

/**
 * 用 vm 在 sandbox 執行 .js 檔，取出 window.<globalName>
 * 適用於 course-data.js、instructor-data.js、tools-data.js 這類純資料 IIFE
 */
async function loadGlobalFromScript(relPath, globalName) {
  const code = await fs.readFile(path.join(ROOT, relPath), 'utf8');
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  const value = sandbox.window[globalName];
  if (!value) throw new Error(`Missing window.${globalName} after running ${relPath}`);
  return value;
}

/**
 * 讀 .md 檔（含具名錯誤）
 */
async function readMd(relPath) {
  try {
    return await fs.readFile(path.join(ROOT, relPath), 'utf8');
  } catch (e) {
    throw new Error(`Failed to read ${relPath}: ${e.message}`);
  }
}

/**
 * 載入 11 份輔助素材（.md/.csv/.yaml；不含規章類 PDF）
 * @returns {Promise<Array<{id:string,name:string,file:string,ext:string,content:string}>>}
 */
async function loadAuxMaterials() {
  const base = '完整課程包/教學素材';
  const files = [
    { id: 'B1', name: '品牌調性指南', file: '品牌調性指南.md', ext: 'md' },
    { id: 'B2', name: '老闆口語稿', file: '老闆口語稿.md', ext: 'md' },
    { id: 'B3', name: '3 段爛提示詞', file: '3段爛提示詞.md', ext: 'md' },
    { id: 'B4', name: '會議錄音逐字稿範本', file: '會議錄音逐字稿範本.md', ext: 'md' },
    { id: 'B5', name: '亂格式請購單', file: '亂格式請購單.csv', ext: 'csv' },
    { id: 'B6', name: '雜亂客訴 10 則', file: '雜亂客訴10則.md', ext: 'md' },
    { id: 'B7', name: '發票自動整理 Skill 範本', file: '發票自動整理_SKILL.md', ext: 'md' },
    { id: 'B8', name: '課堂實作素材_Day1', file: '課堂實作素材_Day1.md', ext: 'md' },
    { id: 'B9', name: '課堂實作素材_Day2', file: '課堂實作素材_Day2.md', ext: 'md' },
    { id: 'B10', name: '課堂實作素材_Day3', file: '課堂實作素材_Day3.md', ext: 'md' },
    { id: 'B11', name: '課程輔助文件', file: '../課程輔助文件.md', ext: 'md' },
  ];
  const out = [];
  for (const f of files) {
    const filePath = path.join(ROOT, base, f.file);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      out.push({ ...f, content });
    } catch (e) {
      throw new Error(`Failed to read aux material ${f.name}: ${e.message}`);
    }
  }
  return out;
}

/**
 * 把任意文字產生為 base64 PNG 的 QR Code，回傳可內嵌的 markdown 圖片標籤
 * 失敗時 fallback 為純文字 URL（不擋 build）
 * @param {string} text - 要編碼的文字（通常是 URL）
 * @param {object} [opts] - { width, alt }
 */
export async function qrPng(text, opts = {}) {
  try {
    const dataUrl = await qrDataUrl(text, opts.width || 240);
    const alt = opts.alt || 'QR Code';
    return `![${alt}](${dataUrl}){.qr}`;
  } catch (e) {
    return `\n> 連結：${text}\n`;
  }
}

/**
 * 產生 QR Code 的 base64 data URL（給 raw HTML <img src="..."> 用）
 * @param {string} text - 要編碼的文字
 * @param {number} width - 像素寬度（預設 240）
 * @returns {Promise<string>} data URL
 */
async function qrDataUrl(text, width = 240) {
  return await QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width,
  });
}

/**
 * HTML 字串跳脫（給 raw HTML 區塊內的動態文字用）
 * @param {string} s
 */
function htmlEscape(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 產生 raw HTML 並排網格容器
 * 用法：figureGrid([{ imgHtml, caption, eyebrow }, ...], { cols: 2 })
 * pandoc gfm+attributes 會 passthrough raw HTML（前後需空行）
 * @param {Array<{imgHtml:string, caption?:string, eyebrow?:string}>} items
 * @param {object} [opts]
 * @param {number} [opts.cols=2] - 欄數（2 或 3）
 * @param {string} [opts.modifier] - 額外 class（例如 'compact'）
 */
function figureGrid(items, opts = {}) {
  const cols = opts.cols || 2;
  const cls = ['figure-grid', `figure-grid-${cols}`, opts.modifier].filter(Boolean).join(' ');
  // 注意：raw HTML block 內每行不能有 4+ 空格縮排，否則 pandoc/GFM 會視為 indented code block
  // 把整個 raw HTML 區塊壓成單行（沒換行 + 沒縮排），避免任何 markdown parser 誤判
  const inner = items.map(it => {
    const eyebrow = it.eyebrow ? `<div class="figure-eyebrow">${htmlEscape(it.eyebrow)}</div>` : '';
    const cap = it.caption ? `<figcaption>${htmlEscape(it.caption)}</figcaption>` : '';
    return `<figure class="grid-figure">${it.imgHtml}${eyebrow}${cap}</figure>`;
  }).join('');
  return `\n<div class="${cls}">${inner}</div>\n`;
}

/**
 * 產生卡片化 raw HTML（用於附錄 C/E/F）
 * 結構：上半部圖片（screenshot 或 QR），下半部含 eyebrow、title、body 段落、footer link
 * @param {object} c
 * @param {string} [c.eyebrow] - 小標籤（例如 'C1'、'TOOL'）
 * @param {string} c.title - 標題
 * @param {string} [c.imgHtml] - 圖片或 QR 的 <img> tag
 * @param {string} [c.body] - 主體 HTML（可有多段、列點）
 * @param {string} [c.qrHtml] - 額外 QR 圖（卡片右下角）
 * @param {string} [c.footer] - 底部小字（例如下載連結）
 */
function card(c) {
  // raw HTML block：壓成單行避免任何縮排被視為 indented code block
  const eyebrow = c.eyebrow ? `<div class="card-eyebrow">${htmlEscape(c.eyebrow)}</div>` : '';
  const img = c.imgHtml ? `<div class="card-media">${c.imgHtml}</div>` : '';
  const body = c.body ? `<div class="card-body">${c.body}</div>` : '';
  const qr = c.qrHtml ? `<div class="card-qr">${c.qrHtml}</div>` : '';
  const footer = c.footer ? `<div class="card-footer">${c.footer}</div>` : '';
  return `<div class="card">${img}${eyebrow}<h3 class="card-title">${htmlEscape(c.title)}</h3>${body}${qr}${footer}</div>`;
}

/**
 * 卡片網格容器
 * @param {string[]} cardsHtml - card() 回傳的 HTML 陣列
 * @param {object} [opts]
 * @param {number} [opts.cols=2]
 */
function cardGrid(cardsHtml, opts = {}) {
  const cols = opts.cols || 2;
  // 整體壓成單行 raw HTML，徹底避開 GFM 的 indented code block 誤判
  return `\n<div class="card-grid card-grid-${cols}">${cardsHtml.join('')}</div>\n`;
}

// === compose*() 函式：本體章節 ===

const TODAY_YYYYMMDD = () => new Date().toISOString().slice(0, 10);

/**
 * 封面：用 raw HTML 容器產出書籍級封面排版
 * - 上方品牌色塊 + 副標
 * - 中段大標、副標
 * - 底部章節列表 + 主辦/講師/日期 metadata
 * 對應 CSS：div.book-cover、div.cover-bar、div.cover-meta
 */
export function composeCover(s) {
  const { meta } = s.COURSE;
  const dayList = (meta.days || []).map(d =>
    `<li><span class="cover-day-num">Day ${d.n}</span><span class="cover-day-title">${htmlEscape(d.title)}</span><span class="cover-day-hours">${d.hours}h</span></li>`
  ).join('\n      ');

  return [
    `# ${meta.title} {.cover}`,
    ``,
    `<div class="book-cover">`,
    `  <div class="cover-bar"></div>`,
    `  <div class="cover-eyebrow">行政與財務 AI 自動化　工作坊</div>`,
    `  <h1 class="cover-title">${htmlEscape(meta.title)}</h1>`,
    `  <p class="cover-subtitle">${htmlEscape(meta.subtitle)}</p>`,
    `  <p class="cover-tagline">4 天課程完整講義 ＋ 教學素材合輯</p>`,
    `  <ul class="cover-day-list">`,
    `      ${dayList}`,
    `  </ul>`,
    `  <div class="cover-meta">`,
    `    <div class="cover-meta-row"><span class="cover-meta-label">計畫</span><span class="cover-meta-value">${htmlEscape(meta.program)}</span></div>`,
    `    <div class="cover-meta-row"><span class="cover-meta-label">主辦</span><span class="cover-meta-value">${htmlEscape(meta.organizer)}</span></div>`,
    `    <div class="cover-meta-row"><span class="cover-meta-label">講師</span><span class="cover-meta-value">${htmlEscape(meta.instructor)}</span></div>`,
    `    <div class="cover-meta-row"><span class="cover-meta-label">產生日期</span><span class="cover-meta-value">${TODAY_YYYYMMDD()}</span></div>`,
    `  </div>`,
    `  <div class="cover-bar cover-bar-bottom"></div>`,
    `</div>`,
    ``,
  ].join('\n');
}

/**
 * 第 0 章：課程總覽
 * 0.1 工作坊資訊  0.2 學習地圖  0.3 共用案例設定（嵌入 sharedCase.md + cases/characters 圖）  0.4 講師簡介
 *
 * 注意：本函式回傳 Promise<string>，因為 0.3 區塊需要 sharp 縮圖（async）
 */
export async function composeOverview(s) {
  const { meta } = s.COURSE;
  const out = [];
  out.push(`# 第 0 章　課程總覽`, ``);

  out.push(`## 0.1 工作坊資訊`, ``);
  out.push(`- **計畫**：${meta.program}`);
  out.push(`- **主辦**：${meta.organizer}`);
  out.push(`- **時間**：${meta.dates}`);
  out.push(`- **地點**：${meta.location}`);
  out.push(`- **形式**：${meta.format}`);
  out.push(`- **講師**：${meta.instructor}`);
  out.push(``);
  out.push(`### 完訓條件`, ``);
  meta.completion.forEach(c => out.push(`- ${c}`));
  out.push(``);
  out.push(`### 學習目標`, ``);
  meta.objectives.forEach(o => out.push(`- ${o}`));
  out.push(``);

  out.push(`## 0.2 學習地圖`, ``);
  out.push(`| Day | 日期 | 主題 | 時數 |`);
  out.push(`| --- | --- | --- | --- |`);
  meta.days.forEach(d => {
    out.push(`| ${d.n} | ${d.date} | ${d.title} | ${d.hours} h |`);
  });
  out.push(``);

  out.push(`## 0.3 共用案例設定`, ``);
  // sharedCase.md 第一行通常是 # 標題，降階為 ###
  const adjusted = s.sharedCase
    .replace(/^# /m, '### ')
    .replace(/^## /gm, '#### ');
  out.push(adjusted, ``);

  // 0.3 末段：兩個案例品牌的視覺（assets/cases/）+ 三個角色去背圖（assets/characters/）
  // 用 raw HTML grid，讓 2 張案例並排、3 張角色並排
  out.push(`#### 案例品牌視覺`, ``);
  const caseFigures = [];
  for (const v of CASE_VISUALS) {
    const imgHtml = await imgTagAsset({ subdir: v.subdir, name: v.name, alt: v.alt, cssClass: 'case-shot' });
    if (imgHtml) caseFigures.push({ imgHtml, caption: v.caption });
  }
  if (caseFigures.length > 0) out.push(figureGrid(caseFigures, { cols: 2 }), ``);

  out.push(`#### 角色圖鑑`, ``);
  const charFigures = [];
  for (const v of CHARACTER_VISUALS) {
    const imgHtml = await imgTagAsset({ subdir: v.subdir, name: v.name, alt: v.alt, cssClass: 'character-shot', maxWidth: 360 });
    if (imgHtml) charFigures.push({ imgHtml, caption: v.caption });
  }
  if (charFigures.length > 0) out.push(figureGrid(charFigures, { cols: 3, modifier: 'compact' }), ``);

  out.push(`## 0.4 講師簡介`, ``);
  if (s.INSTRUCTOR && s.INSTRUCTOR.channel) {
    const c = s.INSTRUCTOR.channel;
    out.push(`**${c.name}**（${c.handle}）`);
    out.push(``);
    if (c.description) out.push(c.description, ``);
    if (c.subscriberCount) out.push(`頻道：${c.subscriberCount}　|　${c.videoCount}`, ``);
    if (c.url) out.push(`YouTube：${c.url}`, ``);
  } else {
    out.push(`*（講師資料未產生，請執行 \`npm run scrape:instructor\`）*`, ``);
  }

  return out.join('\n');
}

/**
 * 把 assets/illustrations/<name> 讀成 markdown 圖片標籤
 * 策略：
 *  - PNG 優先：AI 生圖質感較精緻；用 sharp 縮到 800px wide 寫到 dist/illustrations-tn/
 *  - SVG fallback：手繪示意圖（檔案小、向量），PNG 不存在時改用 SVG base64
 *  - 找不到檔案時回傳空字串（不擋 build）
 */
async function embedIllustration(name, alt = '') {
  if (!name) return '';

  // 1. PNG 優先：sharp 縮小寫到 dist/illustrations-tn/，markdown 用相對路徑引用
  // （base64 PNG 在 Edge headless 印 PDF 時若處於某些位置會 silent drop；
  //  寫成檔案讓 Edge 直接從硬碟載入較可靠）
  const pngMd = await embedAssetPng({
    subdir: 'illustrations',
    name,
    alt,
    cssClass: 'illustration',
  });
  if (pngMd) return pngMd;

  // 2. SVG fallback（檔案小、可 base64 內嵌）
  const svgPath = path.join(ROOT, 'assets', 'illustrations', name + '.svg');
  try {
    const buf = await fs.readFile(svgPath);
    return `![${alt || name}](data:image/svg+xml;base64,${buf.toString('base64')}){.illustration}`;
  } catch {
    return '';
  }
}

/**
 * 通用 PNG 嵌入：assets/<subdir>/<name>.png → 縮圖寫到 dist/<subdir>-tn/<name>.png
 * 並回傳相對路徑的 markdown 標籤（{.<cssClass>} 供 style-ebook.css 控制版型）
 *
 * 為什麼不直接 base64：base64 PNG 在 Edge headless 列印 PDF 時，在某些位置（如 figure
 * 內、跨頁邊界、表格附近）會 silent drop。改寫實體檔讓 Edge 從硬碟載入較穩定。
 *
 * @param {object} opts
 * @param {string} opts.subdir - assets/ 下的子資料夾（例如 'scenarios'）
 * @param {string} opts.name - 不含副檔名的檔名（例如 'day2-u3'）
 * @param {string} [opts.alt] - 替代文字
 * @param {string} [opts.cssClass] - markdown attr CSS class（pandoc raw_attribute）
 * @param {number} [opts.maxWidth] - sharp 寬度上限，預設 800
 * @returns {Promise<string>} markdown 圖片標籤；找不到檔回傳空字串
 */
async function embedAssetPng({ subdir, name, alt = '', cssClass = 'illustration', maxWidth = 800 }) {
  const rel = await prepareAssetThumbnail({ subdir, name, maxWidth });
  if (!rel) return '';
  return `![${alt || name}](${rel}){.${cssClass}}`;
}

/**
 * 同上但回傳 raw HTML <img> tag（供 figureGrid / card 內使用）
 * @returns {Promise<string>} <img> tag；找不到檔回傳空字串
 */
async function imgTagAsset({ subdir, name, alt = '', cssClass = 'illustration', maxWidth = 800 }) {
  const rel = await prepareAssetThumbnail({ subdir, name, maxWidth });
  if (!rel) return '';
  return `<img src="${rel}" alt="${htmlEscape(alt || name)}" class="${cssClass}" />`;
}

/**
 * 把 assets/<subdir>/<name>.png 縮圖寫到 dist/<subdir>-tn/<name>.png，
 * 回傳相對於 dist/工作坊電子書.html 的相對路徑
 * @returns {Promise<string|null>} 相對路徑或 null
 */
async function prepareAssetThumbnail({ subdir, name, maxWidth = 800 }) {
  if (!name) return null;
  const pngPath = path.join(ROOT, 'assets', subdir, name + '.png');
  try {
    const tnDirName = `${subdir}-tn`;
    const tnDir = path.join(ROOT, 'dist', tnDirName);
    await fs.mkdir(tnDir, { recursive: true });
    const tnPath = path.join(tnDir, name + '.png');
    await sharp(pngPath)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toFile(tnPath);
    return `${tnDirName}/${name}.png`;
  } catch {
    return null;
  }
}

/**
 * 對應 embedIllustration() 的 HTML 變體：PNG 優先（AI 生圖質感更精緻）、SVG fallback
 * 用於 figureGrid 的 imgHtml
 */
async function imgTagAssetWithSvgFallback(name, alt = '', cssClass = 'illustration') {
  if (!name) return '';
  // 1. PNG 優先
  const pngTag = await imgTagAsset({ subdir: 'illustrations', name, alt, cssClass });
  if (pngTag) return pngTag;
  // 2. SVG fallback → base64 data URL
  const svgPath = path.join(ROOT, 'assets', 'illustrations', name + '.svg');
  try {
    const buf = await fs.readFile(svgPath);
    const dataU = `data:image/svg+xml;base64,${buf.toString('base64')}`;
    return `<img src="${dataU}" alt="${htmlEscape(alt || name)}" class="${cssClass}" />`;
  } catch {
    return '';
  }
}

/**
 * 從 URL 抓圖、用 sharp 縮圖寫到 dist/remote-tn/<name>.png
 * 用於 YouTube 影片縮圖。fetch 失敗則回傳 null（不擋 build）
 * @returns {Promise<string|null>} 相對路徑或 null
 */
async function prepareRemoteThumbnail({ url, name, maxWidth = 480 }) {
  if (!url || !name) return null;
  try {
    const tnDirName = 'remote-tn';
    const tnDir = path.join(ROOT, 'dist', tnDirName);
    await fs.mkdir(tnDir, { recursive: true });
    const tnPath = path.join(tnDir, name + '.png');
    // 已存在 → 直接用（避免每次 build 都重抓）
    try { await fs.access(tnPath); return `${tnDirName}/${name}.png`; } catch { /* 抓圖 */ }

    const res = await fetch(url);
    if (!res.ok) return null;
    const arr = new Uint8Array(await res.arrayBuffer());
    await sharp(Buffer.from(arr))
      .resize({ width: maxWidth, withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toFile(tnPath);
    return `${tnDirName}/${name}.png`;
  } catch {
    return null;
  }
}

/**
 * 每日章節開頭 hero 圖（與 unit 級 scenario 不同，定位是「章首視覺」）
 * 選擇邏輯：每天挑一張最能代表整天主題的 illustration（PNG 優先 + SVG fallback）
 */
const DAY_HERO_ILLUSTRATIONS = {
  1: { name: 'day1-industry-trends-2026', alt: 'AI 行業趨勢全景圖', caption: '為什麼這 4 天值得來：2026 行政與財務 AI 應用趨勢' },
  2: { name: 'day2-image-to-video', alt: '從文字 → 圖 → 影片的多媒體製作流程', caption: '今日主軸：把文字想法變成海報 / 投影片 / 短影片' },
  3: { name: 'day3-invoice-to-excel', alt: '亂格式素材整理為 Excel 結構', caption: '今日主軸：用 AI 把亂格式素材整理成可用的行政與財務文件' },
  4: { name: 'day4-skill-encapsulation', alt: 'Agent Skill 封裝示意', caption: '今日主軸：把 Day 1~3 的提示詞封裝成可重用的 Agent Skill' },
};

/**
 * Day-Unit 情境圖 caption 對應表
 * 與 index.html 內 SCENARIO_VISUALS 的 caption 同步維護（文案改動需兩處同步）
 * key 規則：day{N}-u{idx+1}，對應 assets/scenarios/<key>.png
 */
const SCENARIO_CAPTIONS = {
  'day1-u1': '帳號登入與工具定位：先分清模型、工具與行政場景。',
  'day1-u2': 'RTFC 提示詞實驗室：把口語稿、長文與爛提示詞逐步修成可用輸出。',
  'day1-u3': '把今天常用的提示詞封裝成一個可以重複呼叫的 Gem。',
  'day2-u1': '文案 → 主視覺 → 加字，三步驟產出 IG 海報。',
  'day2-u2': '規章 + 流程封裝成可重用的「綠野海報生成助手」Gem。',
  'day2-u3': 'Canvas 模式直接生 8 頁 .pptx，下載即用。',
  'day2-u4': '白板分鏡 + HSC 結構（8 秒 / Veo 3.1 上限），先寫腳本再進 Flow。',
  'day2-u5': '以關鍵幀為核心，用 Veo 3.1 一次生 8 秒短片成品（一次生成上限）。',
  'day3-u1': '讓 NotebookLM 只依據上傳來源產生公告、回覆與會議紀錄。',
  'day3-u2': '把亂格式請購單、FAQ、發票與合規規則整理成表格。',
  'day4-u1': '依 agentskills.io 官方規範拆解 SKILL.md（name + description + Markdown body），完成第一版 Skill 範本。',
  'day4-u2': '測試 Skill、安裝 Codex App 與 Plugin、逛 skills.sh，總結結訓。',
};

/**
 * 共用案例品牌與角色圖（assets/cases/、assets/characters/）
 * 用於 composeOverview() 的 0.3 共用案例設定區塊
 */
const CASE_VISUALS = [
  { subdir: 'cases', name: 'warm-light-coffee', alt: '暖光咖啡 3D 立體店家微縮模型', caption: '案例 A｜暖光咖啡（餐飲｜單店咖啡廳）' },
  { subdir: 'cases', name: 'greenfield-select', alt: '綠野選物 3D 立體店家微縮模型', caption: '案例 B｜綠野選物（零售｜小型生活選品店）' },
];
const CHARACTER_VISUALS = [
  { subdir: 'characters', name: 'akai', alt: '阿凱：暖光咖啡店長', caption: '阿凱（暖光咖啡店長）' },
  { subdir: 'characters', name: 'xiaomei', alt: '小美：綠野選物行政主管', caption: '小美（綠野選物行政主管）' },
  { subdir: 'characters', name: 'boss', alt: '老闆／主管', caption: '老闆／主管（兩家共用）' },
];

/**
 * 清理 dayContent.md 中會在電子書脈絡下變成死連結的內容
 * - 移除「對應大綱 / 共用案例 / 教學素材」這類本機路徑導引 blockquote
 * - 把其他「相對路徑」的 markdown link 改寫為純文字（保留 https://）
 */
function cleanDayContentLinks(md) {
  // 1) 整段移除常見的「導引 blockquote」（出現在每份 dayContent 開頭）
  //    格式：> 對應大綱：[..](..)｜共用案例：[..](..)｜教學素材：[..](..)
  let out = md.replace(/^>\s*對應大綱[\s\S]*?教學素材[^\n]*\n/m, '');

  // 2) 把所有非絕對 URL 的 markdown link 改成純文字
  //    匹配 [text](url)，但若 url 以 http:// / https:// / mailto: 開頭則保留原 link
  out = out.replace(
    /\[([^\]]+)\]\((?!https?:\/\/|mailto:)[^)]+\)/g,
    '$1'
  );

  // 3) 同樣處理本機相對的圖片引用 ![alt](path)，避免 pandoc 嘗試載入不存在的檔案
  out = out.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/|data:)[^)]+\)/g,
    ''
  );

  return out;
}

/**
 * Day N 章節
 * 結構：
 *   章首 hero 圖（DAY_HERO_ILLUSTRATIONS）
 *   N.0 學習目標與時程
 *   N.1 ~ N.M 各 unit（含 scenario 圖、概念示意、提示詞、任務 ☐、素材）
 *
 * dayContent（講師講義原稿）刻意不輸出到電子書：
 *   - 屬於講師內部備課資料，學員不需要
 *   - 與 course-data.js 的 unit 摘要存在大量重複內容
 *   - 簽名仍保留 dayContent 參數以維持與呼叫端相容（之後可移除）
 */
export async function composeDay(day, _dayContent, dayNumber) {
  const out = [];
  // 章節標題：去掉 course-data.js 中 "Day N｜" 的前綴（因為已在標題中）
  const cleanTitle = day.title.replace(/^Day \d+｜/, '');
  out.push(`# 第 ${dayNumber} 章　Day ${dayNumber}：${cleanTitle}`, ``);
  out.push(`*${day.date}　${day.hours}*`, ``);
  out.push(``);

  // 章首 hero 圖（每天一張代表性 illustration）
  const hero = DAY_HERO_ILLUSTRATIONS[dayNumber];
  if (hero) {
    const heroImg = await imgTagAssetWithSvgFallback(hero.name, hero.alt, 'day-hero');
    if (heroImg) {
      out.push(`<figure class="day-hero-figure">`);
      out.push(`  ${heroImg}`);
      out.push(`  <figcaption>${htmlEscape(hero.caption)}</figcaption>`);
      out.push(`</figure>`, ``);
    }
  }

  // N.0 學習目標 + 時程表
  out.push(`## ${dayNumber}.0 學習目標與時程`, ``);
  out.push(`### 學習目標`, ``);
  out.push(`> ${day.learningGoal}`, ``);
  out.push(`### 時程表`, ``);
  out.push(`| 時段 | 段落 | 重點 |`);
  out.push(`| --- | --- | --- |`);
  (day.schedule || []).forEach(([t, sec, focus]) => {
    out.push(`| ${t} | ${sec} | ${focus} |`);
  });
  out.push(``);

  // N.1 ~ N.M 各 unit
  for (let idx = 0; idx < (day.units || []).length; idx++) {
    const u = day.units[idx];
    const num = `${dayNumber}.${idx + 1}`;
    out.push(`## ${num} ${u.title}`, ``);
    if (u.subtitle) out.push(`*${u.subtitle}*`, ``);
    if (u.time) out.push(`時段：${u.time}`, ``);
    out.push(``);

    // 情境圖：assets/scenarios/day{N}-u{idx+1}.png（與 index.html SCENARIO_VISUALS 對應）
    const scenarioKey = `day${dayNumber}-u${idx + 1}`;
    const scenarioCaption = SCENARIO_CAPTIONS[scenarioKey];
    if (scenarioCaption) {
      const scenarioMd = await embedAssetPng({
        subdir: 'scenarios',
        name: scenarioKey,
        alt: `${u.title} 情境圖`,
        cssClass: 'scenario',
      });
      if (scenarioMd) {
        out.push(scenarioMd, ``);
        out.push(`*${scenarioCaption}*`, ``);
      }
    }

    // 概念示意圖：unit.concepts[].illustration 對應 assets/illustrations/<name>.png
    // 多張時自動 2 欄 grid，1 張時保留單張置中
    const concepts = (u.concepts || []).filter(c => c.illustration);
    if (concepts.length > 0) {
      out.push(`### 概念示意圖`, ``);
      if (concepts.length === 1) {
        const c = concepts[0];
        const imgMd = await embedIllustration(c.illustration, c.heading || c.illustration);
        if (imgMd) {
          out.push(imgMd, ``);
          if (c.heading) out.push(`*${c.heading}*`, ``);
        }
      } else {
        const figs = [];
        for (const c of concepts) {
          const imgHtml = await imgTagAssetWithSvgFallback(c.illustration, c.heading || c.illustration, 'illustration');
          if (imgHtml) figs.push({ imgHtml, caption: c.heading || '' });
        }
        if (figs.length > 0) out.push(figureGrid(figs, { cols: 2 }), ``);
      }
    }

    if ((u.goals || []).length > 0) {
      out.push(`### 學習目標`, ``);
      out.push(`<div class="goals-callout">`);
      u.goals.forEach(g => out.push(`  <div class="goal-item">${htmlEscape(g)}</div>`));
      out.push(`</div>`, ``);
    }

    if ((u.prompts || []).length > 0) {
      out.push(`### 提示詞範例`, ``);
      u.prompts.forEach(p => {
        // 用卡片化的提示詞區塊（h4 + note + code），CSS 用 .prompt-block 加左上角徽章
        out.push(`<div class="prompt-block">`);
        out.push(`  <div class="prompt-header"><span class="prompt-badge">PROMPT</span><span class="prompt-title">${htmlEscape(p.title)}</span></div>`);
        if (p.note) out.push(`  <div class="prompt-note">${htmlEscape(p.note)}</div>`);
        out.push(`</div>`, ``);
        out.push('```text');
        out.push(p.text);
        out.push('```', ``);
      });
    }

    if ((u.tasks || []).length > 0) {
      out.push(`### 任務清單`, ``);
      out.push(`<ul class="task-list">`);
      u.tasks.forEach(t => out.push(`  <li><span class="task-box"></span><span class="task-label">${htmlEscape(t.label)}</span></li>`));
      out.push(`</ul>`, ``);
    }

    if ((u.materials || []).length > 0) {
      out.push(`### 本單元素材`, ``);
      out.push(`<ul class="material-list">`);
      u.materials.forEach(m => {
        out.push(`  <li><span class="material-name">${htmlEscape(m.name)}</span><span class="material-type">${htmlEscape(m.type)}</span><span class="material-desc">${htmlEscape(m.desc || '')}</span></li>`);
      });
      out.push(`</ul>`, ``);
    }
  }

  // 講師講義原稿（dayContent.md）不輸出到電子書 — 屬於講師備課內部資料，
  // 學員主流程由 N.0 學習目標 + N.1~N.M 單元卡片完整覆蓋
  return out.join('\n');
}

/**
 * 第 5 章：結訓測驗（紙本作答區）
 * 不放答案 — 答案在附錄 D
 */
export function composeQuiz(quiz) {
  const out = [];
  out.push(`# 第 5 章　結訓測驗（${quiz.length} 題）`, ``);
  out.push(`> 紙本作答區。寫下你的答案後，請翻到「附錄 D：結訓測驗解答」對答案。`, ``);

  quiz.forEach((q, i) => {
    const num = i + 1;
    const tag = q.type === 'multi' ? '（複選）' : '（單選）';
    out.push(`## 第 ${num} 題 ${tag}`, ``);
    out.push(q.q, ``);
    q.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx);
      out.push(`(${letter}) ${opt}`, ``);
    });
    out.push(`**我的答案：______**`, ``);
  });

  return out.join('\n');
}

// === compose*() 函式：附錄 ===

/**
 * 附錄 A：教學素材總覽
 * 一張表：類型｜素材名稱｜使用時機（哪天哪 unit）｜在本書的位置（附錄 B/C）
 */
export function composeAppendixA(materials) {
  const out = [];
  out.push(`# 附錄 A　教學素材總覽`, ``);
  out.push(`本工作坊共 ${materials.length} 份教學素材，分為兩類：`, ``);
  out.push(`- **規章 / SOP / 手冊類**（PDF 文件）：請見附錄 C 的 QR Code 索引`);
  out.push(`- **輔助素材類**（.md / .csv / .yaml）：全文嵌入見附錄 B`, ``);

  out.push(`| 類型 | 素材名稱 | 使用時機 | 在本書位置 |`);
  out.push(`| --- | --- | --- | --- |`);
  materials.forEach(m => {
    const where = m.type === 'PDF 文件' ? '附錄 C' : '附錄 B';
    const usedIn = (m.usedIn || []).join(' / ');
    out.push(`| ${m.type} | ${m.name} | ${usedIn} | ${where} |`);
  });
  out.push(``);
  return out.join('\n');
}

/**
 * 附錄 B：輔助素材全文（11 份 .md/.csv/.yaml）
 * - .md：直接嵌入（h1/h2 各降一階，避免污染 TOC）
 * - .csv：用 markdown 表格渲染（首列當 header）
 * - .yaml：fenced code block
 *
 * 過濾規則：
 *   - 「課後測驗題庫」段落：從含「課後測驗題庫」的標題行起，切到下一個同層級
 *     或更高層級標題之前（檔尾為止）— 電子書不放題庫
 */
export function composeAppendixB(auxMaterials) {
  const out = [];
  out.push(`# 附錄 B　輔助素材全文（${auxMaterials.length} 份）`, ``);

  auxMaterials.forEach(m => {
    out.push(`## ${m.id}　${m.name}`, ``);
    out.push(`*檔案：\`完整課程包/教學素材/${m.file}\`*`, ``);

    if (m.ext === 'md') {
      const filtered = stripQuizSection(m.content);
      const adjusted = filtered
        .replace(/^# /gm, '### ')
        .replace(/^## /gm, '#### ');
      out.push(adjusted, ``);
    } else if (m.ext === 'csv') {
      out.push(csvToMarkdownTable(m.content), ``);
    } else if (m.ext === 'yaml') {
      out.push('```yaml');
      out.push(m.content);
      out.push('```', ``);
    }
  });

  return out.join('\n');
}

/**
 * 從 markdown 文字中切除「課後測驗題庫」段落
 * 用「課後測驗題庫」關鍵字定位（不依賴特定編號），從該標題行開始砍到檔尾
 * 因為題庫通常是文件最後一段；若之後還有其他段落，可改為砍到下一個同層級標題前
 * @param {string} md
 * @returns {string}
 */
function stripQuizSection(md) {
  const m = md.match(/^(#{1,6})\s+.*?課後測驗題庫.*$/m);
  if (!m) return md;
  const startIdx = m.index;
  const headingLevel = m[1].length;
  // 找到題庫標題之後第一個「同層級或更高層級」的標題；找不到代表題庫到檔尾，全切
  const tail = md.slice(startIdx + m[0].length);
  const nextHeadingPattern = new RegExp(`^#{1,${headingLevel}}\\s`, 'm');
  const nextMatch = tail.match(nextHeadingPattern);
  if (nextMatch) {
    const cutEnd = startIdx + m[0].length + nextMatch.index;
    return (md.slice(0, startIdx) + md.slice(cutEnd)).replace(/\n{3,}/g, '\n\n').trimEnd();
  }
  return md.slice(0, startIdx).trimEnd();
}

/**
 * 簡易 CSV → markdown 表格（不處理引號內逗號）
 */
function csvToMarkdownTable(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0) return '';
  const rows = lines.map(l => l.split(',').map(c => c.trim()));
  const header = rows[0];
  const body = rows.slice(1);
  const out = [];
  out.push('| ' + header.join(' | ') + ' |');
  out.push('| ' + header.map(() => '---').join(' | ') + ' |');
  body.forEach(r => out.push('| ' + r.join(' | ') + ' |'));
  return out.join('\n');
}

/**
 * 附錄 C：規章/SOP/手冊 PDF 索引（8 份；每份一頁含 QR Code）
 * QR Code 指向 GitHub raw URL，學員掃了直接下載 PDF
 */
const QR_BASE = 'https://raw.githubusercontent.com/kevintsai1202/ai-workshop/main/完整課程包/教學素材/pdf/';

const REGULATION_PDFS = [
  { id: 'C1', name: '綠野選物_員工差勤與休假管理辦法', file: '綠野選物_員工差勤與休假管理辦法.pdf' },
  { id: 'C2', name: '綠野選物_新進員工教育訓練手冊', file: '綠野選物_新進員工教育訓練手冊.pdf' },
  { id: 'C3', name: '綠野選物_新品上架公告作業辦法', file: '綠野選物_新品上架公告作業辦法.pdf' },
  { id: 'C4', name: '暖光咖啡_FAQ官方版', file: '暖光咖啡_FAQ官方版.pdf' },
  { id: 'C5', name: '暖光咖啡_商品退換貨政策', file: '暖光咖啡_商品退換貨政策.pdf' },
  { id: 'C6', name: '暖光咖啡_客訴處理SOP', file: '暖光咖啡_客訴處理SOP.pdf' },
  { id: 'C7', name: '暖光咖啡_食材進貨與庫存管理辦法', file: '暖光咖啡_食材進貨與庫存管理辦法.pdf' },
  { id: 'C8', name: '公司費用報支管理辦法', file: '公司費用報支管理辦法.pdf' },
];

export async function composeAppendixC(materials) {
  const out = [];
  out.push(`# 附錄 C　規章 / SOP / 手冊 PDF 索引（${REGULATION_PDFS.length} 份）`, ``);
  out.push(`> 8 份規章類素材排版精細，未轉成文字嵌入本書。請以 QR Code 連到課程 repo 直接下載 PDF。`, ``);

  // 卡片化 + 2 欄並排（每頁 4 張卡片）
  const cards = [];
  for (const r of REGULATION_PDFS) {
    const downloadUrl = QR_BASE + encodeURIComponent(r.file);
    const meta = materials.find(m => {
      const key = r.name.replace(/^(暖光咖啡_|綠野選物_)/, '').slice(0, 4);
      return m.name.includes(key);
    });
    const brand = r.name.startsWith('暖光咖啡_') ? '暖光咖啡' :
                  r.name.startsWith('綠野選物_') ? '綠野選物' : '通用';
    const cleanName = r.name.replace(/^(暖光咖啡_|綠野選物_)/, '');
    const bodyParts = [];
    if (meta?.desc) bodyParts.push(`<p class="card-desc">${htmlEscape(meta.desc)}</p>`);
    if (meta?.usedIn) bodyParts.push(`<p class="card-meta"><span class="card-meta-label">使用時機</span>${htmlEscape(meta.usedIn.join(' / '))}</p>`);

    const qrDataU = await qrDataUrl(downloadUrl, 200).catch(() => null);
    const qrHtml = qrDataU ? `<img src="${qrDataU}" alt="${htmlEscape(r.name)} QR Code" class="qr" />` : '';

    cards.push(card({
      eyebrow: `${r.id}　${brand}`,
      title: cleanName,
      body: bodyParts.join('\n'),
      qrHtml,
      footer: `<a href="${htmlEscape(downloadUrl)}">掃 QR 下載 PDF</a>`,
    }));
  }
  out.push(cardGrid(cards, { cols: 2 }), ``);

  return out.join('\n');
}

/**
 * 附錄 D：結訓測驗解答
 * 每題：正解（A/B/C） + 解析（如果 quiz 物件有 explain）+ 對應章節（如果有 section）
 */
export function composeAppendixD(quiz) {
  const out = [];
  out.push(`# 附錄 D　結訓測驗解答`, ``);
  out.push(`> 第 5 章作答完成後，請對照本附錄。每題附「對應章節」可回頭複習。`, ``);

  quiz.forEach((q, i) => {
    const num = i + 1;
    const ansLetter = Array.isArray(q.answer)
      ? q.answer.map(a => String.fromCharCode(65 + a)).join(', ')
      : String.fromCharCode(65 + q.answer);
    out.push(`## 第 ${num} 題`, ``);
    out.push(`**正解**：${ansLetter}`, ``);
    if (q.explain) out.push(`**解析**：${q.explain}`, ``);
    if (q.section) out.push(`**對應章節**：${q.section}`, ``);
  });

  return out.join('\n');
}

/**
 * 附錄 E：工具圖鑑（卡片化 + 2 欄並排）
 * TOOLS 是直接陣列；screenshot 是相對路徑
 */
export async function composeAppendixE(TOOLS) {
  const out = [];
  out.push(`# 附錄 E　工具圖鑑`, ``);

  if (!TOOLS || !Array.isArray(TOOLS) || TOOLS.length === 0) {
    out.push(`*（工具資料未產生，請執行 \`npm run scrape:tools\`）*`, ``);
    return out.join('\n');
  }

  out.push(`本工作坊使用的 ${TOOLS.length} 個 AI 工具，掃 QR Code 直達官網。`, ``);

  const cards = [];
  for (const t of TOOLS) {
    // screenshot：原本走 base64，改為走 dist/tool-shots-tn/ 縮圖（避免 silent drop）
    let imgHtml = '';
    if (t.screenshot) {
      try {
        const imgPath = path.join(ROOT, t.screenshot);
        const tnDir = path.join(ROOT, 'dist', 'tool-shots-tn');
        await fs.mkdir(tnDir, { recursive: true });
        const baseName = path.basename(t.screenshot, path.extname(t.screenshot));
        const tnPath = path.join(tnDir, baseName + '.png');
        await sharp(imgPath)
          .resize({ width: 720, withoutEnlargement: true })
          .png({ compressionLevel: 9 })
          .toFile(tnPath);
        imgHtml = `<img src="tool-shots-tn/${baseName}.png" alt="${htmlEscape(t.name)} 截圖" class="tool-shot" />`;
      } catch { /* 截圖失敗略過 */ }
    }
    const qrDataU = t.url ? await qrDataUrl(t.url, 180).catch(() => null) : null;
    const qrHtml = qrDataU ? `<img src="${qrDataU}" alt="${htmlEscape(t.name)} QR Code" class="qr" />` : '';
    const bodyParts = [];
    if (t.tagline) bodyParts.push(`<p class="card-desc">${htmlEscape(t.tagline)}</p>`);
    if (t.url) bodyParts.push(`<p class="card-meta"><span class="card-meta-label">官網</span><a href="${htmlEscape(t.url)}">${htmlEscape(t.url)}</a></p>`);

    cards.push(card({
      eyebrow: 'AI TOOL',
      title: t.name,
      imgHtml,
      body: bodyParts.join('\n'),
      qrHtml,
    }));
  }
  out.push(cardGrid(cards, { cols: 2 }), ``);

  return out.join('\n');
}

const INSTRUCTOR_VIDEO_COUNT = 8;

/**
 * 附錄 F：講師熱門 YouTube 影片（卡片化 + 2 欄並排，含縮圖）
 * INSTRUCTOR.recentVideos 已依觀看數排序（見 scrape-youtube-channel.mjs）
 */
export async function composeAppendixF(INSTRUCTOR) {
  const out = [];
  out.push(`# 附錄 F　講師熱門 YouTube 影片`, ``);

  if (!INSTRUCTOR || !INSTRUCTOR.recentVideos || INSTRUCTOR.recentVideos.length === 0) {
    out.push(`*（講師影片資料未產生，請執行 \`npm run scrape:instructor\`）*`, ``);
    return out.join('\n');
  }

  const top = INSTRUCTOR.recentVideos.slice(0, INSTRUCTOR_VIDEO_COUNT);
  out.push(`下列 ${top.length} 部為講師頻道熱門影片（依觀看數排序）。`, ``);

  const cards = [];
  for (let i = 0; i < top.length; i++) {
    const v = top[i];
    // 從 v.url 萃取 videoId（多種格式：?v=ID、/watch?v=ID&pp=...）
    const videoId = v.url?.match(/[?&]v=([^&]+)/)?.[1] || `video-${i}`;
    let imgHtml = '';
    if (v.thumbnail) {
      const rel = await prepareRemoteThumbnail({ url: v.thumbnail, name: videoId, maxWidth: 480 });
      if (rel) imgHtml = `<img src="${rel}" alt="${htmlEscape(v.title)} 縮圖" class="video-thumb" />`;
    }
    const qrDataU = v.url ? await qrDataUrl(v.url, 180).catch(() => null) : null;
    const qrHtml = qrDataU ? `<img src="${qrDataU}" alt="${htmlEscape(v.title)} QR Code" class="qr" />` : '';
    const bodyParts = [];
    if (v.views) bodyParts.push(`<p class="card-meta"><span class="card-meta-label">觀看數</span>${htmlEscape(v.views)}</p>`);
    if (v.url) bodyParts.push(`<p class="card-link"><a href="${htmlEscape(v.url)}">${htmlEscape(v.url)}</a></p>`);

    cards.push(card({
      eyebrow: `YOUTUBE　No.${i + 1}`,
      title: v.title,
      imgHtml,
      body: bodyParts.join('\n'),
      qrHtml,
    }));
  }
  out.push(cardGrid(cards, { cols: 2 }), ``);

  return out.join('\n');
}
