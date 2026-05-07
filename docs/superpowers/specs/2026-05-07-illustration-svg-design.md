# 工作坊網站插圖優化（SVG 為主）— 設計規格

- 日期：2026-05-07
- 範圍：依 [data/illustration-audit.md](../../../data/illustration-audit.md) 稽核結果，把缺插圖與圖片密度低的章節補上 5 張概念類插圖。
- 形式：手寫 SVG（由 Claude 產出，不依賴 Codex 或 PNG 生圖）。

## 目標

1. 補齊 `materials-overview` 章節（唯一完全沒有插圖的高優先區段）。
2. 為 4 個 Day 章節各補一張概念圖，提升敘事節奏。
3. 建立可拔插的「插圖系統」— 未來把任一張 SVG 換成 PNG 只需改副檔名與檔案，CSS / markup 不動。
4. 缺檔時頁面不破版（graceful fallback）。

## 範圍：5 張 SVG

| # | 檔名 | 插入位置 | 主題 | viewBox 比例 |
|---|------|---------|------|-------------|
| 1 | `materials-overview.svg` | `#materials-overview` 章節頂部 banner | 多種文件類型（PDF/CSV/YAML/MD）被分類整理 | 4:1 |
| 2 | `day1-models-vs-tools.svg` | Day 1 單元 1 講解面板 | 模型（引擎）vs 工具（車身）對比 | 3:2 |
| 3 | `day2-image-to-video.svg` | Day 2 單元 2 Flow 講解 | 角色定裝照 → 影片連續鏡頭 | 3:2 |
| 4 | `day3-invoice-to-excel.svg` | Day 3 單元 2 發票講解 | 發票照片 → AI → Excel 表格 | 3:2 |
| 5 | `day4-skill-encapsulation.svg` | Day 4 單元 1 Skill 概念 | 提示詞 → 包裝盒 → Skill | 3:2 |

## 風格守則

- 扁平線稿 + 品牌色塊
- 取色：使用 `currentColor` 與 CSS 變數 `--accent`、`--accent-soft`、`--surface` 等，不寫死顏色 — 自動適配淺／深色主題
- 字級：SVG 內若有文字，使用 `font-family="inherit"`、`font-size="14"` 之類相對單位
- 大小限制：每張 ≤ 8KB（純線稿 + 區塊填色，不含 base64 圖片或外部資源）
- 一致性：所有 SVG 使用相同的線寬規則（主線 2px、副線 1px）

## 程式整合

### 資源位置
- `assets/illustrations/*.svg`

### 引用方式
- 外部 `<img src>`（與既有 `.brand-visual`、`.scenario-visual` 一致）
- 不採用 inline `<svg>`（保留將來換 PNG 的彈性）

### 新增 CSS classes

```css
.illustration                /* 通用容器 */
.illustration--banner        /* 章節頂部寬幅 4:1 */
.illustration--inline        /* 章節內 3:2 */
.illustration img            /* 圖片本身 */
```

### 失敗保險（必要）

每個 `<img>` 加 `onerror` handler：
```html
<img src="..." onerror="this.parentElement.style.display='none'">
```
缺檔時整個 `.illustration` 容器隱藏，不會留下破圖。

### 換成 PNG 的流程

1. 把 `assets/illustrations/foo.svg` 換成 `foo.png`
2. 改 index.html 對應 `<img src>` 副檔名
3. 其他 markup / CSS 都不動

## 渲染插入點

| 區塊 | 現有 render 函式 | 插入位置 | 對應源碼定位（大致） |
|------|------------------|---------|---------------------|
| `materials-overview` | `renderMaterials()` | `<header>` 之後、表格之前 | index.html 約 2700 行 |
| Day 1 單元 1 | 講解 panel 渲染 | 「模型 vs 工具」table 之前 | course-data.js `day1.units[0].lecture` |
| Day 2 單元 2 | 講解 panel 渲染 | Flow 介紹段落 | course-data.js `day2.units[1].lecture` |
| Day 3 單元 2 | 講解 panel 渲染 | 發票辨識段落 | course-data.js `day3.units[1].lecture` |
| Day 4 單元 1 | 講解 panel 渲染 | Agent Skills 概念段落 | course-data.js `day4.units[0].lecture` |

註：Day 內單元的講解 panel 結構需在實作階段對照 `index.html` 確定 — 可能需要為每個 lecture 段落支援 `illustration` 欄位。

## 實作順序

1. **基建**：CSS classes + 失敗保險 + `assets/illustrations/` 資料夾
2. **第 1 張高優先 SVG**：`materials-overview.svg`（章節頂部 banner）
3. **驗證**：Playwright 截圖確認版面正確
4. **批次補完 4 張 Day 插圖**
5. **再驗證 + commit**

## 不做的事（避免範圍蔓延）

- 不改既有 `.brand-visual`、`.scenario-visual` 樣式
- 不重畫 `assets/characters/*.png`（akai/xiaomei/boss 維持 PNG）
- 不改主題色變數本身，只引用
- 不對 `圓形去背.png`（講師頭像）做任何更動

## 驗證

1. Playwright 截圖各個被改動的章節，肉眼確認新插圖位置正確
2. 自動化檢查每張 `<img>` `naturalWidth > 0`（檔案載入成功）
3. 暫時改名一個 SVG 檔模擬缺檔，確認 fallback 真的隱藏容器（手動）

## 風險

- **講解 panel 結構若不支援自訂插圖欄位**：需先擴充 panel 的 schema（在 course-data.js 加 `illustration` 欄位、index.html 對應渲染）。如果改動太大會單獨提出。
- **顏色適配**：暗色主題若效果不理想，需要為 SVG 設第二組顏色變數。
