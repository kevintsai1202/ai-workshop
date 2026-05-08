# 工作坊插圖 PNG 產圖提示詞

> 用途：把 5 張說明性插圖從手寫 SVG 升級為 AI 生圖 PNG，提升視覺豐富度。
> 工作流：把每段 **英文 prompt** 貼進 image2 → 下載 PNG → 依「輸出檔名」存到 `assets/illustrations/` → 重新整理頁面即自動取代 SVG（程式碼不需動）。

---

## 統一風格指南（所有 5 張共用）

要與既有 `assets/scenarios/*.png`、`assets/characters/*.png` 視覺一致，請在每張的 prompt 加上以下 **style anchor**：

```
Style anchor: warm-lit semi-realistic 3D render, soft natural lighting, light wood
desk surface, beige and teal accent palette, friendly approachable mood, shallow
depth of field, clean Taiwanese office aesthetic, no signs of clutter, subtle
sticky-notes and stationery in background, NOT a flat infographic, NOT pure
vector art.
```

**Negative prompt（建議全部都加）：**
```
flat illustration, infographic style, vector art, line drawing, low detail,
chinese text rendered as garbled glyphs, watermarks, logos, signature, harsh
shadows, oversaturated colors, multiple competing focal points
```

> ⚠ 中文字若 image2 渲染有問題，可在 prompt 把所有中文標籤改成英文（保持比例 4:1 / 3:2 不變）。

---

## 1. `materials-overview.png` （banner 4:1）

**插入位置**：`#materials-overview` 章節頂部
**輸出路徑**：`assets/illustrations/materials-overview.png`
**aspect ratio**：`4:1`（寬幅 banner）
**主題**：4 天工作坊累積的多種教學素材彙整

**Prompt（英文，貼進 image2）：**
```
Top-down isometric desk view of organized workshop teaching materials, banner
composition, 4:1 wide aspect ratio. Five document types laid out in a clean
horizontal row: a printed PDF policy document, a printed CSV spreadsheet, an
iPad screen showing a YAML config file, a notebook with markdown notes, and a
photographed receipt. Each labeled with a small minimalist tag. Coffee cup,
sticky notes, a pen, and a small succulent at the edges as decoration. Light
oak wood desk surface. Soft natural window light from the upper-left. Warm
beige + teal color palette.

[Style anchor as above]
```

---

## 2. `day1-models-vs-tools.png` （inline 3:2）

**插入位置**：Day 1 unit 1 concept B「模型 vs 工具」
**輸出路徑**：`assets/illustrations/day1-models-vs-tools.png`
**aspect ratio**：`3:2`
**主題**：用「引擎 vs 車身」比喻 AI 模型 vs 工具

**Prompt（英文）：**
```
Two miniature toys arranged side-by-side on a light wood desk: on the left, a
small detailed engine block model labeled "MODEL · GPT / Gemini"; on the right,
a sleek toy car body (no wheels visible) labeled "TOOL · ChatGPT App /
NotebookLM". A subtle dotted line connects them suggesting interchangeability.
Soft daylight from a window, shallow depth of field. A small whiteboard in the
out-of-focus background shows two simple icons (gear and steering wheel).

[Style anchor as above]
Aspect ratio: 3:2 horizontal.
```

---

## 3. `day2-image-to-video.png` （inline 3:2）

**插入位置**：Day 2 unit 2「AI 影片核心原理」
**輸出路徑**：`assets/illustrations/day2-image-to-video.png`
**aspect ratio**：`3:2`
**主題**：靜態關鍵幀 → 動畫片段 → 完整影片的 3 步驟

**Prompt（英文）：**
```
A workspace showing a three-stage video production flow on a light wood desk,
left to right. Stage 1: three printed character keyframes (same person in
different poses) clipped to a small board labeled "frames". Stage 2: a tablet
showing a short looping video clip with a play icon, labeled "animate". Stage
3: a laptop screen showing a video editor timeline with three clips merged,
labeled "compose". Subtle dotted-line arrows connect the three stages. Coffee
cup and a stylus on the desk. Warm window light.

[Style anchor as above]
Aspect ratio: 3:2 horizontal.
```

---

## 4. `day3-invoice-to-excel.png` （inline 3:2）

**插入位置**：Day 3 unit 2「Skill 預演」
**輸出路徑**：`assets/illustrations/day3-invoice-to-excel.png`
**aspect ratio**：`3:2`
**主題**：發票照片 → AI 辨識／分類 → Excel 表格的流程

**Prompt（英文）：**
```
A bookkeeper's desk top-down view, three-stage workflow left to right. Stage 1:
a small stack of three real Taiwan invoice receipts (high-speed rail ticket,
lunch receipt, office supply receipt) slightly fanned out. Stage 2: a smartphone
hovering above the receipts capturing them, with a glowing soft blue scan line
suggesting AI processing. Stage 3: a laptop screen displaying an organized
expense spreadsheet with date / item / amount / category columns. Subtle dotted
arrow flows from receipts to phone to laptop. Light wood desk, warm light, a
calculator and a pen on the side.

[Style anchor as above]
Aspect ratio: 3:2 horizontal.
```

---

## 5. `day4-skill-encapsulation.png` （inline 3:2）

**插入位置**：Day 4 unit 1「Agent Skill 結構（agentskills.io 官方規範）」
**輸出路徑**：`assets/illustrations/day4-skill-encapsulation.png`
**aspect ratio**：`3:2`
**主題**：Skill = 資料夾 + SKILL.md（含 YAML frontmatter `name` + `description` 與 Markdown body）。Progressive disclosure 機制：agent 啟動只讀 metadata，匹配才載入 body。

**Prompt（英文）：**
```
A clean wooden desk scene illustrating the agentskills.io specification. On
the left, an open folder labeled "invoice-to-excel/" containing a prominent
text file labeled "SKILL.md" (with two visible sub-folders: "references/" and
"scripts/" tucked beside it). The SKILL.md file is shown opened with two
clearly readable sections: a small YAML header at the top showing
"name: invoice-to-excel" and "description: ..." (truncated), and below it a
markdown body labeled "# Instructions" with bullet steps. In the middle, a
glowing magnifying glass hovers over the description line, with a small label
"description = trigger + purpose" pointing to it. On the right, a laptop screen
shows a terminal with three installed skills listed (skill-creator, invoice-
to-excel, meeting-summary) inside an "Agent" application window, and a small
"Discovery → Activation → Execution" stepped arrow flowing toward the laptop.
Warm natural lighting, top-down angle, illustrative flat-vector style with
subtle paper texture. No "SKILL.yaml" filename anywhere — only "SKILL.md".

[Style anchor as above]
Aspect ratio: 3:2 horizontal.
```

**重點檢查（產圖後逐項對照）：**

- ✅ 檔名是 `SKILL.md`，**不是** `SKILL.yaml`
- ✅ 出現「資料夾 + SKILL.md」結構（含 references/、scripts/ 子目錄）
- ✅ frontmatter 顯示 `name:` 與 `description:` 兩個欄位（無 trigger / inputs / outputs / steps / prompt）
- ✅ 有 `description = trigger + purpose` 的標註，呼應官方「做什麼 + 何時用」雙重作用
- ✅ progressive disclosure 三階段（Discovery → Activation → Execution）以箭頭呈現
- ✅ 終端內列出已安裝 Skill 中含 `skill-creator`（呼應課程內容）

---

## 6. `day4-skill-folder-structure.png` （inline 3:2）

**插入位置**：Day 4 unit 1「Skill 資料夾結構（agentskills.io 官方規範）」概念區塊
**輸出路徑**：`assets/illustrations/day4-skill-folder-structure.png`
**aspect ratio**：`3:2`
**主題**：一個 Skill 的標準資料夾佈局，視覺化展示「invoice-to-excel/ 內含 SKILL.md（必要）+ references/、scripts/、assets/（選填）」與命名規則。**取代原本嵌在 d4-p1 提示詞範本上方的 ASCII 樹狀備註，用圖示呈現。**

**Prompt（英文）：**
```
A clean illustrative diagram of a directory tree representing an Agent Skill
folder structure on the left, with annotations on the right. The tree shows:

- Top-level folder labeled "invoice-to-excel/" with a small note "name field"
  pointing to the folder name.
- Inside the folder, indented with tree connectors (├── └──):
  - A prominent file labeled "SKILL.md" with a green/highlighted "Required"
    badge next to it and a small note "metadata + instructions".
  - A subfolder "references/" with a faded "Optional" badge and inside it a
    PDF-style icon labeled "expense-policy.pdf".
  - A subfolder "scripts/" with "Optional" badge.
  - A subfolder "assets/" with "Optional" badge.

On the right side, a vertical info card showing:
- Heading "Naming rules" with code-style examples in monospace font:
  - "✅ invoice-to-excel" (green)
  - "❌ Invoice-To-Excel" (gray, struck-through feel)
  - "❌ auto_invoice" (gray)
  - "❌ pdf--parser" (gray)
  - "❌ -invoice" (gray)
- Heading "Folder name = name" with a brief note that they must be identical.
- Heading "SKILL.md required" noting other subdirectories are optional.

Style: flat-vector illustration with subtle paper texture, monospace font for
code/path strings, warm natural lighting. Bottom caption: "agentskills.io
specification — one skill = one folder + SKILL.md".

Aspect ratio: 3:2 horizontal.
```

**重點檢查（產圖後逐項對照）：**

- ✅ 樹狀根目錄寫 `invoice-to-excel/`（不是其他名字）
- ✅ `SKILL.md` 有「Required / 必要」標籤
- ✅ `references/`、`scripts/`、`assets/` 三個子目錄都標「Optional / 選填」
- ✅ 命名規則卡呈現 ✅ 與 ❌ 對照（含底線、大寫、連續 hyphen 三種反例）
- ✅ 標註「資料夾名 = name 欄位」
- ✅ 底部引用 agentskills.io

---

## 7. `day4-skill-install-location.png` （inline 3:2）

**插入位置**：Day 4 unit 1「Antigravity Skill 安裝位置」概念區塊（緊接資料夾結構之後）
**輸出路徑**：`assets/illustrations/day4-skill-install-location.png`
**aspect ratio**：`3:2`
**主題**：Antigravity skill 兩個安裝範圍對比（Global vs Workspace）+ 跨平台路徑（macOS/Linux/Windows）+ 跨工具差異警告（Antigravity vs Gemini CLI vs Codex vs Claude Code）。**讓學員一眼看清楚 SKILL.md 寫好之後該放哪。**

**Prompt（英文）：**
```
A clean illustrative reference card showing where to install Agent Skills for
Google Antigravity, with a side-by-side two-card layout on top and a warning
strip on the bottom.

Top-left card titled "GLOBAL · cross-project":
- Small home icon labeled "User home directory"
- Subsection "macOS / Linux" with monospace path:
  ~/.gemini/antigravity/skills/
- Subsection "Windows" with monospace path:
  %USERPROFILE%\.gemini\antigravity\skills\
- Caption "Shared across all projects. Recommended for personal skills."
- Small green badge labeled "Recommended"

Top-right card titled "WORKSPACE · current project":
- Small folder icon labeled "Project root"
- Subsection "macOS / Linux / Windows" with monospace path:
  <project>/.agent/skills/
- Subsection "Priority" showing "workspace > global" with a brief note
  "same-name skill in workspace overrides global"
- Caption "Project-specific only. Useful for company- or client-specific
  skills."
- Small neutral badge labeled "Special use"

Bottom warning strip with dashed border, labeled "⚠ Cross-tool path
differences", listing four tool→path pairs in monospace:
- Antigravity → ~/.gemini/antigravity/skills/
- Gemini CLI → ~/.gemini/skills/
- Codex App → installed via Plugins UI
- Claude Code → .claude/skills/

Bottom caption: "Same SKILL.md works across tools — just different install
paths. Use symbolic links to share."

Style: flat-vector illustration, monospace font for paths, warm natural
lighting, paper texture. Use color-coding subtly: blue for paths, green for
"Recommended", yellow for the warning strip.

Aspect ratio: 3:2 horizontal.
```

**重點檢查（產圖後逐項對照）：**

- ✅ Global 卡分別列出 macOS/Linux 路徑（`~/.gemini/antigravity/skills/`）與 Windows 路徑（`%USERPROFILE%\.gemini\antigravity\skills\`）
- ✅ Workspace 卡顯示 `<project>/.agent/skills/` 與優先順序「workspace > global」
- ✅ 底部警告區塊明確列出 4 個工具的不同 skill 路徑（Antigravity / Gemini CLI / Codex App / Claude Code）
- ✅ 標示「Recommended」與「Special use」徽章區分兩種範圍的使用建議
- ✅ 底部提到「symbolic link」跨工具共用方案
- ✅ 路徑全部用 monospace 字型，視覺化區隔指令與說明文字

---

## 工作流程

1. 開啟你的 image2，依序貼上面 5 段 prompt
2. 為每張選擇對應的比例（4:1 一張、3:2 四張）
3. 下載 PNG，存到 `assets/illustrations/` 並用對應的「輸出路徑」檔名（注意：**不能改名**，否則網站找不到）
4. 重新整理瀏覽器頁面即自動以 PNG 取代原 SVG（程式碼有 fallback 機制）
5. 任一張不滿意可以重產 PNG 覆蓋 — SVG 仍保留作為最後保險

## 想退回某一張的 SVG？

直接把對應 PNG 刪掉即可（網站會自動退回 SVG）。

## 微調建議

- 如果 image2 對中文標籤渲染品質差：把 prompt 中所有 `"Input"` `"模型"` 之類改成英文／拼音
- 如果整體調性太冷：在 style anchor 加 `"golden hour lighting, warm sunset tone"`
- 如果風格不夠統一：5 張都用同一個 seed（如果 image2 支援），可大幅提高一致性
