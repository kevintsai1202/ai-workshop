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
    { id: 'B7', name: '發票自動整理 Skill 範本', file: '發票自動整理_Skill範本.yaml', ext: 'yaml' },
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
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: opts.width || 240,
    });
    const alt = opts.alt || 'QR Code';
    return `![${alt}](${dataUrl}){.qr}`;
  } catch (e) {
    return `\n> 連結：${text}\n`;
  }
}

// === compose*() 函式：本體章節 ===

const TODAY_YYYYMMDD = () => new Date().toISOString().slice(0, 10);

/**
 * 封面：標題、副標、產生日期、主辦資訊
 * h1.cover 樣式由 style-ebook.css 控制（不分頁、置中、大字）
 */
export function composeCover(s) {
  const { meta } = s.COURSE;
  return [
    `# ${meta.title} {.cover}`,
    ``,
    `**${meta.subtitle}**`,
    ``,
    `4 天課程完整講義 + 教學素材合輯`,
    ``,
    `---`,
    ``,
    `${meta.program}`,
    ``,
    `${meta.organizer}`,
    ``,
    `講師：${meta.instructor}`,
    ``,
    `產生日期：${TODAY_YYYYMMDD()}`,
    ``,
  ].join('\n');
}

/**
 * 第 0 章：課程總覽
 * 0.1 工作坊資訊  0.2 學習地圖  0.3 共用案例設定（嵌入 sharedCase.md）  0.4 講師簡介
 */
export function composeOverview(s) {
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
 * 把 assets/illustrations/<name> 讀成 base64 markdown 圖片標籤
 * 策略：
 *  - SVG 優先：6-9 KB、向量、可放大；對 base64 內嵌最友善
 *  - PNG fallback：原檔通常 2-3 MB（AI 生圖），會讓 Edge headless 解碼超時
 *    → 用 sharp 動態縮到 max 800px wide，base64 後約 100-300 KB
 *  - 找不到檔案時回傳空字串（不擋 build）
 */
async function embedIllustration(name, alt = '') {
  if (!name) return '';

  // 1. SVG 優先
  const svgPath = path.join(ROOT, 'assets', 'illustrations', name + '.svg');
  try {
    const buf = await fs.readFile(svgPath);
    return `![${alt || name}](data:image/svg+xml;base64,${buf.toString('base64')}){.illustration}`;
  } catch { /* try PNG */ }

  // 2. PNG fallback：sharp 縮小寫到 dist/illustrations-tn/，markdown 用相對路徑引用
  // （base64 PNG 在 Edge headless 印 PDF 時若處於某些位置會 silent drop；
  //  寫成檔案讓 Edge 直接從硬碟載入較可靠）
  const pngPath = path.join(ROOT, 'assets', 'illustrations', name + '.png');
  try {
    const tnDir = path.join(ROOT, 'dist', 'illustrations-tn');
    await fs.mkdir(tnDir, { recursive: true });
    const tnPath = path.join(tnDir, name + '.png');
    await sharp(pngPath)
      .resize({ width: 800, withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toFile(tnPath);
    // markdown 用相對於 dist/工作坊電子書.html 的相對路徑（HTML 在 dist/，圖在 dist/illustrations-tn/）
    return `![${alt || name}](illustrations-tn/${name}.png){.illustration}`;
  } catch {
    return '';
  }
}

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
 * 結構：N.0 學習目標 + 時程表
 *       N.A 整份 dayContent.md 作為講師講義（h1 降階為 h2、清理死連結）
 *       N.1 ~ N.M 各 unit（含概念示意圖 / 學習目標 / 提示詞 / 任務 ☐ / 素材引用）
 * 註：unit.concepts 的文字內容已被 dayContent.md 涵蓋故不重複；
 *     但 concepts[].illustration 對應的圖片會嵌入到該 unit 區塊。
 */
export async function composeDay(day, dayContent, dayNumber) {
  const out = [];
  // 章節標題：去掉 course-data.js 中 "Day N｜" 的前綴（因為已在標題中）
  const cleanTitle = day.title.replace(/^Day \d+｜/, '');
  out.push(`# 第 ${dayNumber} 章　Day ${dayNumber}：${cleanTitle}`, ``);
  out.push(`*${day.date}　${day.hours}*`, ``);

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

  // N.A 章節導論：整份 dayContent.md
  // - 清理本機相對連結與圖片（在 PDF 中會變死連結 file://D:/...）
  // - 第一個 h1 降階為 h2、第二層 h2 降為 h3，避免污染 TOC
  const cleaned = cleanDayContentLinks(dayContent);
  const adjusted = cleaned
    .replace(/^# /m, '## ')
    .replace(/^## /gm, '### ');
  out.push(`## ${dayNumber}.A 講師講義`, ``);
  out.push(adjusted, ``);

  // N.1 ~ N.M 各 unit
  for (let idx = 0; idx < (day.units || []).length; idx++) {
    const u = day.units[idx];
    const num = `${dayNumber}.${idx + 1}`;
    out.push(`## ${num} ${u.title}`, ``);
    if (u.subtitle) out.push(`*${u.subtitle}*`, ``);
    if (u.time) out.push(`時段：${u.time}`, ``);
    out.push(``);

    // 概念示意圖：unit.concepts[].illustration 對應 assets/illustrations/<name>.png
    const concepts = (u.concepts || []).filter(c => c.illustration);
    if (concepts.length > 0) {
      out.push(`### 概念示意圖`, ``);
      for (const c of concepts) {
        const imgMd = await embedIllustration(c.illustration, c.heading || c.illustration);
        if (imgMd) {
          out.push(imgMd, ``);
          if (c.heading) out.push(`*${c.heading}*`, ``);
        }
      }
    }

    if ((u.goals || []).length > 0) {
      out.push(`### 學習目標`, ``);
      u.goals.forEach(g => out.push(`- ${g}`));
      out.push(``);
    }

    if ((u.prompts || []).length > 0) {
      out.push(`### 提示詞範例`, ``);
      u.prompts.forEach(p => {
        out.push(`#### ${p.title}`, ``);
        if (p.note) out.push(`> ${p.note}`, ``);
        out.push('```text');
        out.push(p.text);
        out.push('```', ``);
      });
    }

    if ((u.tasks || []).length > 0) {
      out.push(`### 任務清單`, ``);
      u.tasks.forEach(t => out.push(`- ☐ ${t.label}`));
      out.push(``);
    }

    if ((u.materials || []).length > 0) {
      out.push(`### 本單元素材`, ``);
      u.materials.forEach(m => {
        out.push(`- **${m.name}**（${m.type}）— ${m.desc || ''}`);
      });
      out.push(``);
    }
  }

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
 */
export function composeAppendixB(auxMaterials) {
  const out = [];
  out.push(`# 附錄 B　輔助素材全文（${auxMaterials.length} 份）`, ``);

  auxMaterials.forEach(m => {
    out.push(`## ${m.id}　${m.name}`, ``);
    out.push(`*檔案：\`完整課程包/教學素材/${m.file}\`*`, ``);

    if (m.ext === 'md') {
      const adjusted = m.content
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

  for (const r of REGULATION_PDFS) {
    const downloadUrl = QR_BASE + encodeURIComponent(r.file);
    // 從 COURSE.materials 找對應 desc（用名稱關鍵字模糊比對）
    const meta = materials.find(m => {
      const key = r.name.replace(/^(暖光咖啡_|綠野選物_)/, '').slice(0, 4);
      return m.name.includes(key);
    });
    out.push(`## ${r.id}　${r.name}`, ``);
    if (meta) {
      if (meta.desc) out.push(`**用途**：${meta.desc}`);
      if (meta.usedIn) out.push(`**使用時機**：${meta.usedIn.join(' / ')}`);
      out.push(``);
    }
    out.push(await qrPng(downloadUrl, { alt: `${r.name} QR Code`, width: 240 }), ``);
    out.push(`下載連結：\`${downloadUrl}\``, ``);
    out.push(`---`, ``);
  }

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
 * 附錄 E：工具圖鑑
 * TOOLS 是直接陣列；screenshot 是檔案路徑（讀檔轉 base64）
 */
export async function composeAppendixE(TOOLS) {
  const out = [];
  out.push(`# 附錄 E　工具圖鑑`, ``);

  if (!TOOLS || !Array.isArray(TOOLS) || TOOLS.length === 0) {
    out.push(`*（工具資料未產生，請執行 \`npm run scrape:tools\`）*`, ``);
    return out.join('\n');
  }

  out.push(`本工作坊使用的 ${TOOLS.length} 個 AI 工具，掃 QR Code 直達官網。`, ``);

  for (const t of TOOLS) {
    out.push(`## ${t.name}`, ``);
    if (t.tagline) out.push(`*${t.tagline}*`, ``);
    if (t.url) {
      out.push(`官網：${t.url}`, ``);
      out.push(await qrPng(t.url, { alt: `${t.name} QR Code`, width: 200 }), ``);
    }
    // screenshot 是相對路徑，讀檔轉 base64
    if (t.screenshot) {
      try {
        const imgPath = path.join(ROOT, t.screenshot);
        const buf = await fs.readFile(imgPath);
        const b64 = buf.toString('base64');
        out.push(`![${t.name} 截圖](data:image/png;base64,${b64}){.tool-shot}`, ``);
      } catch (e) {
        out.push(`*（截圖讀取失敗：${t.screenshot}）*`, ``);
      }
    }
    out.push(`---`, ``);
  }

  return out.join('\n');
}

const INSTRUCTOR_VIDEO_COUNT = 8;

/**
 * 附錄 F：講師熱門 YouTube 影片
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

  for (const v of top) {
    out.push(`## ${v.title}`, ``);
    if (v.views) out.push(`${v.views}`, ``);
    if (v.url) {
      out.push(`網址：${v.url}`, ``);
      out.push(await qrPng(v.url, { alt: `${v.title} QR Code`, width: 200 }), ``);
    }
    out.push(`---`, ``);
  }

  return out.join('\n');
}
