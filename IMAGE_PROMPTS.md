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

**插入位置**：Day 4 unit 1「Agent Skill 三要素」
**輸出路徑**：`assets/illustrations/day4-skill-encapsulation.png`
**aspect ratio**：`3:2`
**主題**：Input / Output / Trigger 三要素被封裝成可重用的 Skill 包裝盒

**Prompt（英文）：**
```
A clean wooden desk with three small labeled boxes on the left ("Input",
"Output", "Trigger") visually feeding into a beautifully wrapped gift-box style
package in the center labeled "SKILL.yaml" with a ribbon on top. On the right,
a laptop screen shows a terminal with three skill commands listed (@invoice,
@meeting, @faq-bot) inside an "Antigravity" application window. Subtle dotted-
line connections from the three boxes converging into the gift box, then a
single arrow from the gift box to the laptop. Warm natural lighting.

[Style anchor as above]
Aspect ratio: 3:2 horizontal.
```

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
