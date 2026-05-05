# 行政與財務流程 AI 自動化｜互動教學工作坊

115-116 強化服務業人才韌性計畫的 4 天課程互動教學網頁。桌面版、工作坊式互動、modern-minimal + editorial serif 雙重風格、含暗色模式。

---

## 檔案結構

```
ai-workshop-v3/
├── index.html        ← 主檔（UI + CSS + JS 全部 inline）
├── course-data.js    ← 課程資料（4 天大綱、17 條 RTFC 提示詞、34 個任務、10 份素材、8 題測驗）
└── README.md         ← 本說明
```

兩個檔案必須放在**同一個目錄**，因為 `index.html` 透過相對路徑 `<script src="course-data.js">` 載入課程資料。

---

## 開啟方式

### 方式 1：本機雙擊（最簡單）

把整個資料夾複製到桌面或任何位置，雙擊 `index.html` 即可在瀏覽器開啟。建議使用 Chrome / Edge / Safari / Firefox 最新版。

> ⚠️ 部分瀏覽器（特別是 Chrome）在 `file://` 協定下可能阻擋 `localStorage` — 進度將無法保存。如遇此情況，請改用方式 2 啟動本地伺服器。

### 方式 2：本地靜態伺服器（推薦）

在資料夾內開啟終端機並執行其中一個：

```powershell
# Windows PowerShell（需先安裝 Python 3）
python -m http.server 8000

# 或 Node.js
npx serve .
```

開啟瀏覽器訪問 `http://localhost:8000`。

### 方式 3：上傳到任何靜態主機

直接把 `index.html` 與 `course-data.js` 一起上傳到：

- GitHub Pages
- Netlify / Vercel（拖曳資料夾即可）
- 公司內網的任意 web server
- Cloudflare Pages、Firebase Hosting 等

無需建置流程、無需後端 — 純靜態。

---

## 互動功能說明

| 功能 | 說明 |
|------|------|
| **章節導覽**    | 左側 sidebar 8 個章節（總覽 / 共用案例 / Day 1-4 / 教學素材 / 結訓測驗），點選平滑捲動。 |
| **任務勾選**    | 34 條任務分布在 9 個單元中，可勾選追蹤。每個單元有「N / N」進度 pill，整體進度顯示在 sidebar 底部。 |
| **RTFC 提示詞** | 17 張提示詞卡，每張右上角「複製」按鈕一鍵複製到剪貼簿。 |
| **單元展開**    | 9 個單元為 accordion 結構，點擊標題展開／收合。 |
| **互動測驗**    | 結訓測驗 8 題（全單選），「送出 / 即時批改」會顯示分數、標記正解與錯誤、給出對應章節指引。 |
| **進度持久化**   | 任務勾選、測驗作答、暗色模式偏好全部寫入 `localStorage` — 下次開啟自動還原。 |
| **暗色模式**    | 右上角太陽 / 月亮按鈕切換；首次進入依系統偏好（`prefers-color-scheme`）。 |
| **響應式佈局**   | 1100px 以下 sidebar 縮窄；880px 以下改單欄堆疊。 |

---

## 修改課程內容

只需編輯 `course-data.js`：

| 想改什麼 | 改哪裡 |
|---------|--------|
| 增刪任務          | 對應 day 的 `units[i].tasks` 陣列 |
| 增改提示詞         | 對應 day 的 `units[i].prompts` 陣列 |
| 改 4 天大綱／日期   | `meta.days` |
| 改測驗題目         | `quiz` 陣列 |
| 改共用案例（雙品牌） | `sharedCase` |
| 改素材清單         | `materials` |

任務 ID 命名規則：`day{n}-u{n}-t{n}`（例：`day2-u1-t3` 是 Day 2 第 1 單元第 3 個任務）。**ID 一旦發布請勿更動**，否則學員已勾選的進度（依 ID 索引）會錯位。

UI 樣式（色彩、字體、間距、佈局）全部在 `index.html` 的 `<style>` 區塊；改 `:root` 的 CSS 變數即可換主題。

---

## 結訓條件

- 出席時數達 80% 以上
- 完成前後測考試（後測即為本網頁的「結訓測驗」8 題）
- 達 75 分（8 題答對 6 題以上）為結訓標準

---

## 課程資料來源

所有內容來自隨課程包提供的：
- 客綱（4 天大綱）
- 4 天詳細教學內容
- 17 條 RTFC 提示詞範例
- 共用案例（暖光咖啡 / 綠野選物雙品牌）
- 教學素材庫（規章 / SOP / 政策 / Skill 範本 / 測驗題庫）
- 後測 8 題

無填料、無虛構數據 — 任何缺漏處請以原始課程包為準。

---

## 技術棧

- 純 HTML5 + CSS3 + Vanilla JavaScript（ES6+）
- 無外部 CDN、無框架、無建置流程
- 字體：系統字體 + Google Fonts 系列（Newsreader / Tiempos）作為 serif 顯示字
- 約 70 KB（index.html）+ 56 KB（course-data.js）= 約 126 KB（未壓縮）

---

## 授權

本互動網頁與課程內容為「行政與財務流程 AI 自動化」教育訓練計畫專用。如需用於其他課程或商業用途，請洽計畫主辦單位。
