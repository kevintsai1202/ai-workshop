# 工作坊電子書 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 4 天工作坊網頁與課程包，自動化打包成單一 PDF 電子書（`dist/工作坊電子書.pdf`），素材依「11 份輔助素材全文嵌入 + 8 份規章 PDF QR Code 索引」混合策略放在附錄。

**Architecture:** Node 腳本 `scripts/build-ebook.mjs` 從 `course-data.js`（vm 模組執行）+ 4 份 .md 課程文件讀資料，組稿成 master markdown，沿用 pandoc + Edge headless 印 PDF。`compose*()` 純函式分離到 `scripts/lib/compose-ebook.mjs`、PDF 渲染抽到 `scripts/lib/render-pdf.mjs`。

**Tech Stack:** Node ESM、`vm` 模組、`qrcode`（npm）、pandoc（外部）、Edge headless（外部）、PowerShell。

**對應 Spec:** [docs/superpowers/specs/2026-05-07-workshop-ebook-design.md](../specs/2026-05-07-workshop-ebook-design.md)

---

## File Structure

| 檔案 | 角色 | 預估行數 |
|---|---|---|
| `scripts/build-ebook.mjs` | CLI 入口、主流程、串接 compose 與 render | ~120 |
| `scripts/lib/compose-ebook.mjs` | 11 個 `compose*()` 純函式 + `loadSources()` + `qrPng()` | ~600 |
| `scripts/lib/render-pdf.mjs` | pandoc + Edge headless 包裝 | ~80 |
| `完整課程包/教學素材/_build/style-ebook.css` | 電子書專用 print CSS | ~100 |
| `package.json` | 加 `build:ebook` script、`qrcode` 依賴 | 修改 |
| `.gitignore` | 加 `dist/` | 修改 |
| `README.md` | 加電子書建構章節 | 修改 |
| `dist/工作坊電子書.md` | 中間產物（master markdown，不入 git） | gitignored |
| `dist/工作坊電子書.pdf` | 最終電子書（不入 git） | gitignored |

---

## Task 1: 環境準備（套件、目錄、gitignore）

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1.1：安裝 qrcode 套件**

```powershell
npm install --save-dev qrcode
```

預期：`package.json` 的 `devDependencies` 出現 `"qrcode": "^x.y.z"`，`package-lock.json` 更新。

- [ ] **Step 1.2：把 `dist/` 加到 .gitignore**

讀現有 `.gitignore`，在末尾加：

```
# 電子書建構產物（每次 build 都會重產）
dist/
```

- [ ] **Step 1.3：建立 dist/ 目錄（佔位）**

```powershell
New-Item -ItemType Directory -Path "dist" -Force | Out-Null
```

(不需要 commit `dist/`，因為已 gitignore)

- [ ] **Step 1.4：Commit**

```powershell
git add package.json package-lock.json .gitignore
git commit -m "chore: 加入 qrcode 套件與 dist/ 忽略規則（電子書建構基礎設施）"
```

---

## Task 2: compose-ebook.mjs 骨架（loadSources、qrPng）

**Files:**
- Create: `scripts/lib/compose-ebook.mjs`

- [ ] **Step 2.1：建立檔案，寫 import 與 loadSources()**

`scripts/lib/compose-ebook.mjs`：

```javascript
// 工作坊電子書 — 純函式組稿模組
// 每個 compose*() 都接收已 load 的資料、回傳 markdown string
// 沒有任何 I/O 副作用（loadSources 例外，集中放在最上方）
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import url from 'node:url';
import QRCode from 'qrcode';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

/**
 * 把 course-data.js / instructor-data.js / tools-data.js 用 vm 執行，
 * 取出 window.COURSE / INSTRUCTOR / TOOLS。
 * 同步讀 4 份 .md 課程文件。
 * 缺欄位即拋具名錯誤。
 */
export async function loadSources() {
  const COURSE = await loadGlobalFromScript('course-data.js', 'COURSE');
  const INSTRUCTOR = await loadGlobalFromScript('instructor-data.js', 'INSTRUCTOR');
  const TOOLS = await loadGlobalFromScript('tools-data.js', 'TOOLS');

  // 讀 4 份 .md
  const overview = await readMd('完整課程包/課程總覽.md');
  const sharedCase = await readMd('完整課程包/共用案例設定.md');
  const dayContents = {
    day1: await readMd('完整課程包/Day1_0513_產業趨勢與AI基礎入門/課程內容.md'),
    day2: await readMd('完整課程包/Day2_0520_AI多媒體內容製作/課程內容.md'),
    day3: await readMd('完整課程包/Day3_0527_行政文件與財務資料整理/課程內容.md'),
    day4: await readMd('完整課程包/Day4_0603_AI代理協作與成果展示/課程內容.md'),
  };

  // 11 份輔助素材（.md/.csv/.yaml 全文）
  const auxMaterials = await loadAuxMaterials();

  // 校驗
  for (const k of ['day1', 'day2', 'day3', 'day4', 'materials', 'quiz', 'meta']) {
    if (!COURSE[k]) throw new Error(`Missing field: COURSE.${k}（請檢查 course-data.js）`);
  }

  return { COURSE, INSTRUCTOR, TOOLS, overview, sharedCase, dayContents, auxMaterials };
}

async function loadGlobalFromScript(relPath, globalName) {
  const code = await fs.readFile(path.join(ROOT, relPath), 'utf8');
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  const value = sandbox.window[globalName];
  if (!value) throw new Error(`Missing window.${globalName} after running ${relPath}`);
  return value;
}

async function readMd(relPath) {
  try {
    return await fs.readFile(path.join(ROOT, relPath), 'utf8');
  } catch (e) {
    throw new Error(`Failed to read ${relPath}: ${e.message}`);
  }
}

/**
 * 讀 11 份輔助素材（不含規章類 PDF）
 * 回傳 [{ id, name, ext, content }]
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
    const content = await fs.readFile(path.join(ROOT, base, f.file), 'utf8');
    out.push({ ...f, content });
  }
  return out;
}

/**
 * 產生一個 base64 PNG QR Code 的 markdown 圖片標籤
 * pandoc 會把 data: URL 直接內嵌到 PDF
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
    return `\n> 連結：${text}\n`;  // fallback
  }
}

// === 以下 compose*() 函式於 Task 3-6 補上 ===
```

- [ ] **Step 2.2：smoke test loadSources 與 qrPng**

```powershell
node -e "import('./scripts/lib/compose-ebook.mjs').then(async m => { const s = await m.loadSources(); console.log('COURSE.meta.title:', s.COURSE.meta.title); console.log('quiz length:', s.COURSE.quiz.length); console.log('day1 units:', s.COURSE.day1.units.length); console.log('aux materials:', s.auxMaterials.length); console.log('qr:', (await m.qrPng('https://example.com')).slice(0, 80)); })"
```

預期輸出：
```
COURSE.meta.title: 行政與財務流程 AI 自動化
quiz length: <整數，10 左右>
day1 units: <整數，3 左右>
aux materials: 11
qr: ![QR Code](data:image/png;base64,iVBOR...
```

任何錯誤代表 loadSources 缺欄位或檔案路徑錯誤，必須先修。

- [ ] **Step 2.3：Commit**

```powershell
git add scripts/lib/compose-ebook.mjs
git commit -m "feat(ebook): 加入 compose-ebook 骨架（loadSources 與 qrPng helper）"
```

---

## Task 3: 本體章節組稿（cover、overview、day、quiz）

**Files:**
- Modify: `scripts/lib/compose-ebook.mjs`（在 `// === 以下 compose*() 函式於 Task 3-6 補上 ===` 標記處接續）

- [ ] **Step 3.1：寫 composeCover()**

接在標記下方加：

```javascript
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
```

- [ ] **Step 3.2：寫 composeOverview()**

```javascript
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
  out.push(s.sharedCase);  // 直接嵌整份 .md
  out.push(``);

  out.push(`## 0.4 講師簡介`, ``);
  if (s.INSTRUCTOR && s.INSTRUCTOR.profile) {
    const p = s.INSTRUCTOR.profile;
    out.push(`**${p.name}**（${p.title || ''}）`);
    out.push(``);
    if (p.bio) out.push(p.bio, ``);
    if (p.channelHandle) out.push(`YouTube：${p.channelHandle}`, ``);
  } else {
    out.push(`*（講師資料未產生，請執行 \`npm run scrape:instructor\`）*`, ``);
  }

  return out.join('\n');
}
```

- [ ] **Step 3.3：寫 composeDay()**

```javascript
/**
 * Day N 章節
 * 結構：N.0 學習目標 + 時程表
 *       N.A 整份 dayContent.md 作為講師講義（h1 降階為 h2）
 *       N.1 ~ N.M 各 unit（goals 條列、prompts、tasks ☐、unit 內素材引用）
 * 註：unit.concepts 不在電子書呈現（內容已被 dayContent.md 涵蓋且更完整）
 */
export function composeDay(day, dayContent, dayNumber) {
  const out = [];
  out.push(`# 第 ${dayNumber} 章　${day.title.replace(/^Day \d+｜/, '')}`, ``);
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

  // 章節導論：整份 dayContent.md
  // 注意：dayContent.md 第一行通常是 # 標題，會跟我們的 # 第N章 衝突 → 把第一個 h1 降階為 h2
  const adjusted = dayContent.replace(/^# /m, '## ');
  out.push(`## ${dayNumber}.A 講師講義`, ``);
  out.push(adjusted, ``);

  // N.1 ~ N.M 各 unit
  (day.units || []).forEach((u, idx) => {
    const num = `${dayNumber}.${idx + 1}`;
    out.push(`## ${num} ${u.title}`, ``);
    if (u.subtitle) out.push(`*${u.subtitle}*`, ``);
    if (u.time) out.push(`時段：${u.time}`, ``);

    // 學習目標
    if ((u.goals || []).length > 0) {
      out.push(`### 學習目標`, ``);
      u.goals.forEach(g => out.push(`- ${g}`));
      out.push(``);
    }

    // 提示詞範例（monospace）
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

    // 任務清單（☐ 紙本勾選）
    if ((u.tasks || []).length > 0) {
      out.push(`### 任務清單`, ``);
      u.tasks.forEach(t => out.push(`- ☐ ${t.label}`));
      out.push(``);
    }

    // 該 unit 引用的素材（標明對應附錄）
    if ((u.materials || []).length > 0) {
      out.push(`### 本單元素材`, ``);
      u.materials.forEach(m => {
        out.push(`- **${m.name}**（${m.type}）— ${m.desc || ''}`);
      });
      out.push(``);
    }
  });

  return out.join('\n');
}
```

- [ ] **Step 3.4：寫 composeQuiz()**

```javascript
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
      const letter = String.fromCharCode(65 + idx); // A, B, C, ...
      out.push(`(${letter}) ${opt}`, ``);
    });
    out.push(`**我的答案：______**`, ``);
  });

  return out.join('\n');
}
```

- [ ] **Step 3.5：Commit**

```powershell
git add scripts/lib/compose-ebook.mjs
git commit -m "feat(ebook): 本體章節組稿（cover、overview、day、quiz）"
```

---

## Task 4: 附錄 A、B 組稿

**Files:**
- Modify: `scripts/lib/compose-ebook.mjs`

- [ ] **Step 4.1：寫 composeAppendixA()（總覽表）**

```javascript
/**
 * 附錄 A：教學素材總覽
 * 一張表：類型｜素材名稱｜使用時機（哪天哪 unit）｜在本書的位置（附錄 B/C）
 */
export function composeAppendixA(materials) {
  const out = [];
  out.push(`# 附錄 A　教學素材總覽`, ``);
  out.push(`本工作坊共 ${materials.length} 份教學素材，分為兩類：`, ``);
  out.push(`- **規章/SOP/手冊類**（PDF 文件）：請見附錄 C 的 QR Code 索引`);
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
```

- [ ] **Step 4.2：寫 composeAppendixB()（11 份輔助素材全文）**

```javascript
/**
 * 附錄 B：輔助素材全文（11 份 .md/.csv/.yaml）
 * - .md：直接嵌入（其中第一個 # 降為 ##）
 * - .csv：用 markdown 表格渲染（首列當 header）
 * - .yaml：fenced code block
 */
export function composeAppendixB(auxMaterials) {
  const out = [];
  out.push(`# 附錄 B　輔助素材全文（${auxMaterials.length} 份）`, ``);

  auxMaterials.forEach(m => {
    out.push(`## ${m.id}　${m.name}`, ``);
    out.push(`*檔案：\`完整課程包/教學素材/${m.file || (m.name + '.' + m.ext)}\`*`, ``);

    if (m.ext === 'md') {
      // 把 .md 中所有 h1 降為 h3（避免污染 TOC）
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
 * CSV → markdown 表格
 * 簡易實作：以逗號 split，不處理引號內逗號（請購單素材無此情形）
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
```

- [ ] **Step 4.3：Commit**

```powershell
git add scripts/lib/compose-ebook.mjs
git commit -m "feat(ebook): 附錄 A、B 組稿（素材總覽 + 11 份輔助素材全文嵌入）"
```

---

## Task 5: 附錄 C、D 組稿

**Files:**
- Modify: `scripts/lib/compose-ebook.mjs`

- [ ] **Step 5.1：寫 composeAppendixC()（8 份規章 PDF + QR Code）**

```javascript
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
    const url = QR_BASE + encodeURIComponent(r.file);
    // 從 COURSE.materials 找對應的 desc/usedIn
    const meta = materials.find(m => m.name.includes(r.name.replace('暖光咖啡_', '').replace('綠野選物_', '').slice(0, 6)));
    out.push(`## ${r.id}　${r.name}`, ``);
    if (meta) {
      out.push(`**用途**：${meta.desc || ''}`);
      if (meta.usedIn) out.push(`**使用時機**：${meta.usedIn.join(' / ')}`);
      out.push(``);
    }
    out.push(await qrPng(url, { alt: `${r.name} QR Code`, width: 240 }), ``);
    out.push(`下載連結：\`${url}\``, ``);
    out.push(`---`, ``);  // 視覺分隔
  }

  return out.join('\n');
}
```

- [ ] **Step 5.2：寫 composeAppendixD()（測驗解答）**

```javascript
/**
 * 附錄 D：結訓測驗解答
 * 每題：正解（A/B/C） + 解析 + 對應章節編號（用 daysIndex 反查）
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
```

- [ ] **Step 5.3：Commit**

```powershell
git add scripts/lib/compose-ebook.mjs
git commit -m "feat(ebook): 附錄 C、D 組稿（規章 QR Code 索引 + 測驗解答）"
```

---

## Task 6: 附錄 E、F 組稿

**Files:**
- Modify: `scripts/lib/compose-ebook.mjs`

- [ ] **Step 6.1：寫 composeAppendixE()（工具圖鑑）**

```javascript
/**
 * 附錄 E：工具圖鑑（6 工具 + QR Code）
 * 截圖來源：tools-data.js 的 base64（如果存在）；不存在則顯示 placeholder
 */
export async function composeAppendixE(TOOLS) {
  const out = [];
  out.push(`# 附錄 E　工具圖鑑`, ``);

  if (!TOOLS || !TOOLS.tools || TOOLS.tools.length === 0) {
    out.push(`*（工具資料未產生，請執行 \`npm run scrape:tools\`）*`, ``);
    return out.join('\n');
  }

  out.push(`本工作坊使用的 ${TOOLS.tools.length} 個 AI 工具，掃 QR Code 直達官網。`, ``);

  for (const t of TOOLS.tools) {
    out.push(`## ${t.name}`, ``);
    if (t.tagline) out.push(`*${t.tagline}*`, ``);
    if (t.url) {
      out.push(`官網：${t.url}`, ``);
      out.push(await qrPng(t.url, { alt: `${t.name} QR Code`, width: 200 }), ``);
    }
    if (t.screenshot) {
      // tools-data.js 的截圖通常是 base64 PNG
      const src = t.screenshot.startsWith('data:') ? t.screenshot : `data:image/png;base64,${t.screenshot}`;
      out.push(`![${t.name} 截圖](${src}){.tool-shot}`, ``);
    }
    out.push(`---`, ``);
  }

  return out.join('\n');
}
```

- [ ] **Step 6.2：寫 composeAppendixF()（講師熱門影片）**

```javascript
const INSTRUCTOR_VIDEO_COUNT = 8;

/**
 * 附錄 F：講師熱門 YouTube 影片
 * INSTRUCTOR.videos 已依觀看數排序（見 scrape-youtube-channel.mjs）
 */
export async function composeAppendixF(INSTRUCTOR) {
  const out = [];
  out.push(`# 附錄 F　講師熱門 YouTube 影片`, ``);

  if (!INSTRUCTOR || !INSTRUCTOR.videos || INSTRUCTOR.videos.length === 0) {
    out.push(`*（講師影片資料未產生，請執行 \`npm run scrape:instructor\`）*`, ``);
    return out.join('\n');
  }

  const top = INSTRUCTOR.videos.slice(0, INSTRUCTOR_VIDEO_COUNT);
  out.push(`下列 ${top.length} 部為講師頻道熱門影片（依觀看數排序）。`, ``);

  for (const v of top) {
    out.push(`## ${v.title}`, ``);
    if (v.viewCount) out.push(`觀看數：${v.viewCount}`, ``);
    if (v.url) {
      out.push(`網址：${v.url}`, ``);
      out.push(await qrPng(v.url, { alt: `${v.title} QR Code`, width: 200 }), ``);
    }
    out.push(`---`, ``);
  }

  return out.join('\n');
}
```

- [ ] **Step 6.3：Commit**

```powershell
git add scripts/lib/compose-ebook.mjs
git commit -m "feat(ebook): 附錄 E、F 組稿（工具圖鑑 + 講師影片 QR Code）"
```

---

## Task 7: build-ebook.mjs 主流程 + CLI flags + npm script

**Files:**
- Create: `scripts/build-ebook.mjs`
- Modify: `package.json`

- [ ] **Step 7.1：建立主腳本**

`scripts/build-ebook.mjs`：

```javascript
#!/usr/bin/env node
// 工作坊電子書建構入口
// 用法：
//   npm run build:ebook                 # 產 dist/工作坊電子書.pdf
//   npm run build:ebook -- --md-only    # 只產 markdown（debug）
//   npm run build:ebook -- --output xxx # 自訂輸出路徑
//   npm run build:ebook -- --keep-html  # 保留中間 HTML
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import {
  loadSources,
  composeCover, composeOverview, composeDay, composeQuiz,
  composeAppendixA, composeAppendixB, composeAppendixC,
  composeAppendixD, composeAppendixE, composeAppendixF,
} from './lib/compose-ebook.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log('[ebook] 載入資料源...');
  const s = await loadSources();

  console.log('[ebook] 組稿 markdown...');
  const sections = [];
  sections.push(composeCover(s));
  sections.push(composeOverview(s));
  sections.push(composeDay(s.COURSE.day1, s.dayContents.day1, 1));
  sections.push(composeDay(s.COURSE.day2, s.dayContents.day2, 2));
  sections.push(composeDay(s.COURSE.day3, s.dayContents.day3, 3));
  sections.push(composeDay(s.COURSE.day4, s.dayContents.day4, 4));
  sections.push(composeQuiz(s.COURSE.quiz));
  sections.push(composeAppendixA(s.COURSE.materials));
  sections.push(composeAppendixB(s.auxMaterials));
  sections.push(await composeAppendixC(s.COURSE.materials));
  sections.push(composeAppendixD(s.COURSE.quiz));
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
    console.log('[ebook] --md-only 模式，跳過 PDF 渲染');
    return;
  }

  // PDF 渲染（Task 9 加上）
  const { renderPdf } = await import('./lib/render-pdf.mjs');
  const outPath = args.output || path.join(distDir, '工作坊電子書.pdf');
  const cssPath = path.join(ROOT, '完整課程包', '教學素材', '_build', 'style-ebook.css');
  await renderPdf({ mdPath, cssPath, outPath, keepHtml: args.keepHtml });
  console.log(`[ebook] 已產出 ${outPath}`);
}

main().catch(e => {
  console.error('[ebook] 失敗：', e.message);
  console.error(e.stack);
  process.exit(1);
});
```

- [ ] **Step 7.2：在 package.json 加 npm script**

讀現有 `package.json`，在 `scripts` 區塊加：

```json
"build:ebook": "node scripts/build-ebook.mjs"
```

- [ ] **Step 7.3：跑 --md-only smoke test**

```powershell
npm run build:ebook -- --md-only
```

預期輸出：
```
[ebook] 載入資料源...
[ebook] 組稿 markdown...
[ebook] 已產出 D:\GitHub\ai-workshop\dist\工作坊電子書.md（XXX.X KB）
[ebook] --md-only 模式，跳過 PDF 渲染
```

開 `dist/工作坊電子書.md` 人工掃過：
- 封面、第 0 章、第 1-4 章、第 5 章、附錄 A-F 都存在
- 每個 `# ` 開頭的章節順序正確
- 沒有 `undefined`、`[object Object]`、空表格等明顯問題

如果發現特定章節為空或錯誤，回到 Task 3-6 修對應 compose 函式。

- [ ] **Step 7.4：Commit**

```powershell
git add scripts/build-ebook.mjs package.json
git commit -m "feat(ebook): 主流程 build-ebook.mjs 與 build:ebook npm script"
```

---

## Task 8: style-ebook.css

**Files:**
- Create: `完整課程包/教學素材/_build/style-ebook.css`

- [ ] **Step 8.1：建立 CSS**

`完整課程包/教學素材/_build/style-ebook.css`：

```css
/* 工作坊電子書專用 print CSS — 走 Edge headless --print-to-pdf */
@page {
  margin: 18mm 16mm;
  size: A4;
}
@page :first { margin: 0; }

body {
  font-family: "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif;
  line-height: 1.7;
  font-size: 11pt;
  color: #1a1d22;
  max-width: 100%;
  margin: 0;
}

/* 章節分頁 */
h1 {
  page-break-before: always;
  font-size: 22pt;
  border-bottom: 2px solid #4f7cdb;
  padding-bottom: 6px;
  margin-top: 0;
  color: #1a1d22;
}
h1.cover, h1.toc { page-break-before: avoid; }

/* 封面置中 */
h1.cover {
  text-align: center;
  font-size: 32pt;
  border-bottom: 0;
  padding-top: 30vh;
}
h1.cover + p, h1.cover ~ p { text-align: center; }

/* 章節層級 */
h2 {
  font-size: 16pt;
  color: #2c4fa5;
  margin-top: 24px;
  border-bottom: 1px solid #e2e5ec;
  padding-bottom: 4px;
}
h3 { font-size: 13pt; color: #1a1d22; margin-top: 18px; }
h4 { font-size: 11.5pt; color: #4f7cdb; margin-top: 14px; }

/* 引言塊（學習目標、重要提醒） */
blockquote {
  border-left: 3px solid #4f7cdb;
  padding: 8px 14px;
  margin: 12px 0;
  background: #f5f7fb;
  color: #2c4fa5;
}

/* 提示詞 / 程式碼區塊 */
pre, code {
  font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
}
pre {
  background: #f5f7fb;
  border-left: 3px solid #4f7cdb;
  padding: 12px 14px;
  font-size: 9.5pt;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  page-break-inside: avoid;
}
code { background: #f5f7fb; padding: 1px 4px; border-radius: 3px; font-size: 9.5pt; }
pre code { background: transparent; padding: 0; }

/* 表格 */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0;
  font-size: 10pt;
  page-break-inside: avoid;
}
th, td {
  border: 1px solid #e2e5ec;
  padding: 6px 10px;
  vertical-align: top;
  text-align: left;
}
thead th { background: #f0f2f5; font-weight: 700; }

/* QR Code 與工具截圖 */
img.qr {
  width: 120px;
  height: 120px;
  display: block;
  margin: 8px 0;
}
img.tool-shot {
  max-width: 80%;
  max-height: 480px;
  border: 1px solid #ccc;
  display: block;
  margin: 12px auto;
}

/* 任務勾選清單 — ☐ 字元已內嵌在文本，僅需確保字元清晰 */
li { line-height: 1.85; }

hr {
  border: 0;
  border-top: 1px dashed #c8cdd6;
  margin: 18px 0;
}

/* TOC 樣式（pandoc 產出 nav#TOC） */
nav#TOC ul { list-style: none; padding-left: 1em; }
nav#TOC > ul { padding-left: 0; }
nav#TOC a { color: #2c4fa5; text-decoration: none; }
```

- [ ] **Step 8.2：Commit**

```powershell
git add "完整課程包/教學素材/_build/style-ebook.css"
git commit -m "feat(ebook): 加入 style-ebook.css（章節分頁、封面、QR Code 等 print 樣式）"
```

---

## Task 9: render-pdf.mjs + PDF 整合

**Files:**
- Create: `scripts/lib/render-pdf.mjs`
- Reference: `完整課程包/教學素材/_build/build-pdf.ps1`（既有邏輯，照抄到 node 版）

- [ ] **Step 9.1：閱讀既有 build-pdf.ps1 確認 pandoc 與 Edge headless 參數**

```powershell
Get-Content "完整課程包/教學素材/_build/build-pdf.ps1"
```

特別注意：pandoc 的 flags（如 `-s --metadata title=...`）、Edge headless 的執行檔路徑探測、`--print-to-pdf` 參數。

- [ ] **Step 9.2：建立 render-pdf.mjs**

`scripts/lib/render-pdf.mjs`：

```javascript
// pandoc + Edge headless → PDF（抽自 完整課程包/教學素材/_build/build-pdf.ps1）
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * 把 markdown 轉成 PDF
 * @param {{mdPath: string, cssPath: string, outPath: string, keepHtml?: boolean}} opts
 */
export async function renderPdf({ mdPath, cssPath, outPath, keepHtml = false }) {
  const htmlPath = outPath.replace(/\.pdf$/, '.html');

  // 1. pandoc: md → html（含 TOC）
  console.log('[render-pdf] pandoc → HTML');
  await runCmd('pandoc', [
    mdPath,
    '-s',                          // standalone
    '--toc', '--toc-depth=3',
    '-c', cssPath,
    '--metadata', 'title=工作坊電子書',
    '-o', htmlPath,
  ]);

  // 2. Edge headless: html → pdf
  console.log('[render-pdf] Edge headless → PDF');
  const edgePath = await findEdge();
  if (!edgePath) {
    throw new Error('找不到 Edge 或 Chrome：請安裝 Microsoft Edge 或 Google Chrome');
  }
  // file:// URL 必須是絕對路徑且 forward slashes
  const fileUrl = 'file:///' + path.resolve(htmlPath).replace(/\\/g, '/');
  await runCmd(edgePath, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    `--print-to-pdf=${path.resolve(outPath)}`,
    '--print-to-pdf-no-header',
    '--no-pdf-header-footer',
    fileUrl,
  ]);

  if (!keepHtml) {
    await fs.unlink(htmlPath).catch(() => {});
  }
}

async function findEdge() {
  // 常見路徑（Windows）
  const candidates = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ];
  for (const c of candidates) {
    try { await fs.access(c); return c; } catch { /* 略 */ }
  }
  return null;
}

function runCmd(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: false });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}
```

- [ ] **Step 9.3：跑完整 build**

```powershell
npm run build:ebook
```

預期輸出（時間約 15–60 秒）：
```
[ebook] 載入資料源...
[ebook] 組稿 markdown...
[ebook] 已產出 ...\工作坊電子書.md（XXX.X KB）
[render-pdf] pandoc → HTML
[render-pdf] Edge headless → PDF
[ebook] 已產出 ...\工作坊電子書.pdf
```

- [ ] **Step 9.4：開 PDF 人工 smoke test**

```powershell
Start-Process "dist\工作坊電子書.pdf"
```

確認：
- 封面能正確顯示
- 目錄存在且各章節跳轉正確
- 第 1–4 章每章開新頁
- 提示詞區塊保留 monospace
- 附錄 C 的 QR Code 能用手機掃出 GitHub raw URL
- 附錄 B 的 .csv 顯示為表格、.yaml 顯示為 code block

如果發現問題（中文字型缺失、章節未分頁、QR Code 太小／太大）→ 進 Task 10 修。

- [ ] **Step 9.5：Commit**

```powershell
git add scripts/lib/render-pdf.mjs
git commit -m "feat(ebook): 整合 pandoc + Edge headless 產生 PDF"
```

---

## Task 10: Smoke test 修整 + README 更新

**Files:**
- Modify: 視 smoke test 結果而定（可能是 `style-ebook.css`、`compose-ebook.mjs` 任一處）
- Modify: `README.md`

- [ ] **Step 10.1：修首版 bug**

從 Step 9.4 列出的問題逐一修。常見問題與處置：

| 問題 | 處置位置 | 修法 |
|---|---|---|
| 中文字型缺失（顯示豆腐字） | `style-ebook.css` | 在 `body { font-family }` 增補使用者實際安裝的字型 |
| 章節 h1 沒分頁 | `style-ebook.css` | 確認 `h1 { page-break-before: always; }` 沒被覆蓋 |
| 附錄 B csv 沒渲染為表格 | `compose-ebook.mjs:csvToMarkdownTable` | debug 用 `node -e` 驗證 CSV 解析 |
| QR Code 太大／太小 | `style-ebook.css:img.qr` | 調 width/height |
| 工具截圖未顯示 | `tools-data.js` 內 base64 missing | 跑 `npm run scrape:tools` 重新抓 |
| pandoc 缺指令 | 系統未裝 pandoc | `winget install pandoc` |

每改一次跑 `npm run build:ebook` 重產 PDF 驗證。

- [ ] **Step 10.2：更新 README.md**

讀現有 `README.md`，在「常用指令」或對應章節加：

```markdown
### 建構電子書

把整個工作坊內容打包成單一 PDF（含 4 天課綱、提示詞、任務、結訓測驗、教學素材附錄）：

\`\`\`powershell
npm run build:ebook                  # 產出 dist/工作坊電子書.pdf
npm run build:ebook -- --md-only     # 只產中間 markdown（debug）
\`\`\`

需求：
- pandoc（`winget install pandoc`）
- Microsoft Edge 或 Google Chrome（用 headless 印 PDF）

詳細設計：[docs/superpowers/specs/2026-05-07-workshop-ebook-design.md](docs/superpowers/specs/2026-05-07-workshop-ebook-design.md)
```

- [ ] **Step 10.3：Commit**

```powershell
git add README.md "完整課程包/教學素材/_build/style-ebook.css" scripts/lib/compose-ebook.mjs
git commit -m "fix(ebook): smoke test 後修正首版問題並更新 README"
```

- [ ] **Step 10.4：最終驗收**

```powershell
# 確認檔案產出
Get-ChildItem dist/工作坊電子書.pdf | Select-Object Name, Length, LastWriteTime
# 預期 PDF 大小 5-30 MB（含 base64 圖片）

# 確認沒有未追蹤的關鍵檔
git status
# 預期：clean，或只剩 dist/（已 gitignore，不該顯示）
```

---

## 完成驗收清單

- [ ] `npm run build:ebook` 一行指令即可產 PDF
- [ ] PDF 開啟可看到封面、目錄、第 0–5 章、附錄 A–F
- [ ] 附錄 C 的 8 個 QR Code 用手機掃可下載對應 PDF
- [ ] 附錄 B 的 11 份輔助素材全文可讀（不亂碼）
- [ ] 第 5 章測驗紙本作答區留白足夠寫
- [ ] 附錄 D 解答對得上題目
- [ ] PDF 在 Mac / Windows 預覽都不掉中文字
- [ ] README.md 有電子書建構指令說明
