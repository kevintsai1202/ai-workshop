// 產生「結訓測驗」Word 文件 (.docx)
// 用途：讀取 course-data.js 的 quiz[] 陣列，輸出含題目、選項、解答區的 Word 檔
// 執行：node scripts/build-quiz-docx.mjs
// 輸出：完整課程包/教學素材/結訓測驗.docx
//
// 設計重點：
// 1. 同一份文件分「題目區」與「解答與解析」兩段，由分頁符隔開，方便影印學員版時遮住第二頁
// 2. 字型統一為「Microsoft JhengHei UI」，避免中文 fallback 不一致
// 3. 選項採大寫英文字母 (A)(B)(C) 編號

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  HeadingLevel, PageBreak, BorderStyle,
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ---- 1. 載入 quiz 資料：course-data.js 是瀏覽器全域腳本，用 Node vm 沙箱注入 window.COURSE ----
const courseDataSrc = fs.readFileSync(path.join(projectRoot, 'course-data.js'), 'utf-8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(courseDataSrc, sandbox, { filename: 'course-data.js' });
const COURSE = sandbox.window.COURSE;
if (!COURSE || !Array.isArray(COURSE.quiz)) {
  throw new Error('找不到 window.COURSE.quiz，請確認 course-data.js 結構');
}
const quiz = COURSE.quiz;
const totalQuestions = quiz.length;
const passingScore = 6; // 與 index.html 內 s >= 6 的及格判斷同步
const meta = COURSE.meta || {};

// ---- 2. 各題簡短解析（與課程內容對應，便於講師講解） ----
const explanations = {
  q1: '生成式 AI（LLM）的本質是大規模文字接龍：根據前文計算「下一個 token」的機率分布並抽樣輸出，因此會有幻覺、也會因提示詞改變回答。',
  q2: 'NotebookLM 會強制以使用者上傳的來源（PDF / 連結 / 錄音）為唯一回答依據，不擴張到網路；這是它適合整理公司規章、SOP、會議錄音的原因。',
  q3: 'RTFC 四要素：Role（角色）、Task（任務）、Format（格式）、Constraints（限制）。寫提示詞時四項愈完整，輸出愈穩定。',
  q4: 'NotebookLM 的摘要會附上引用來源（時間戳或頁碼），可以一鍵跳回原始錄音段落驗證內容，避免 AI 幻覺。',
  q5: '影片生成模型對「主角一致性、場景連續性」仍是難題。先用 AI 生成定裝照（Image），再以 Image-to-Video 驅動鏡頭，可大幅穩定畫面風格。',
  q6: 'AI 不是讀心術。把公司會計科目的「定義 + 範例」寫進提示詞當分類規則，AI 才能穩定地把「高鐵票」歸到「差旅費」。',
  q7: 'Agent Skill 的 description 是 AI 路由器：AI 會讀取每個 Skill 的 description 後決定要不要自動載入。寫得不清楚 = Skill 永遠不會被觸發。',
  q8: '對外溝通、財務付款、人事決策等情境必須保留 Human in the Loop（HITL），由人工檢查 AI 產出再放行，這是負責任使用 AI 的底線。',
};

// ---- 3. 樣式常數 ----
const FONT = 'Microsoft JhengHei UI';
const fontRun = (text, opts = {}) => new TextRun({ text, font: FONT, ...opts });

// ---- 4. 組裝題目區段落 ----
const children = [];

// 文件大標題
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  alignment: AlignmentType.CENTER,
  children: [fontRun('行政與財務流程 AI 自動化工作坊', { bold: true, size: 36 })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 200 },
  children: [fontRun('結訓測驗', { bold: true, size: 32 })],
}));

// 應試說明
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 120 },
  children: [
    fontRun(`共 ${totalQuestions} 題（單選） ／ 答對 ${passingScore} 題以上為通過`, { size: 22, color: '555555' }),
  ],
}));

// 應試者欄位（姓名 / 日期 / 分數）
children.push(new Paragraph({
  spacing: { before: 200, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 4 } },
  children: [
    fontRun(`姓名：________________      日期：________________      得分：____ / ${totalQuestions}`, { size: 22 }),
  ],
}));

// 8 道題目
quiz.forEach((item, idx) => {
  // 題號 + 題幹
  children.push(new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [
      fontRun(`${idx + 1}. `, { bold: true, size: 24 }),
      fontRun(item.q, { bold: true, size: 24 }),
    ],
  }));

  // 選項：用大寫英文字母編號 (A) (B) (C)
  item.options.forEach((opt, i) => {
    const letter = String.fromCharCode(65 + i);
    children.push(new Paragraph({
      indent: { left: 480 },
      spacing: { after: 80 },
      children: [
        fontRun(`(${letter}) `, { size: 22 }),
        fontRun(opt, { size: 22 }),
      ],
    }));
  });
});

// ---- 5. 解答與解析區（另起一頁） ----
children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  alignment: AlignmentType.CENTER,
  spacing: { after: 240 },
  children: [fontRun('標準答案與解析', { bold: true, size: 32 })],
}));

children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 240 },
  children: [
    fontRun('（講師版：印製學員版時可先撕除本頁）', { size: 20, italics: true, color: '888888' }),
  ],
}));

quiz.forEach((item, idx) => {
  const correctLetter = String.fromCharCode(65 + item.answer);
  const correctText = item.options[item.answer];

  // 題號 + 題幹（重述）
  children.push(new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [
      fontRun(`${idx + 1}. `, { bold: true, size: 22 }),
      fontRun(item.q, { bold: true, size: 22 }),
    ],
  }));

  // 正確答案
  children.push(new Paragraph({
    indent: { left: 360 },
    spacing: { after: 80 },
    children: [
      fontRun('正解：', { bold: true, color: '006400', size: 22 }),
      fontRun(`(${correctLetter}) ${correctText}`, { color: '006400', size: 22 }),
    ],
  }));

  // 解析
  const exp = explanations[item.id];
  if (exp) {
    children.push(new Paragraph({
      indent: { left: 360 },
      spacing: { after: 120 },
      children: [
        fontRun('解析：', { bold: true, size: 22 }),
        fontRun(exp, { size: 22 }),
      ],
    }));
  }
});

// ---- 6. 組裝 Document ----
const doc = new Document({
  creator: meta.title || '行政與財務流程 AI 自動化工作坊',
  title: '結訓測驗',
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } },
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: FONT },
        paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 },
      },
    ],
  },
  sections: [{
    // A4 紙張、1 吋邊界
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children,
  }],
});

// ---- 7. 輸出 ----
const outDir = path.join(projectRoot, '完整課程包', '教學素材');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, '結訓測驗.docx');

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log(`✔ 已產出：${path.relative(projectRoot, outPath)}`);
console.log(`  共 ${totalQuestions} 題，及格門檻 ${passingScore} 題。`);
