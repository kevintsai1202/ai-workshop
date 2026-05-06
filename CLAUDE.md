# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案性質

「行政與財務流程 AI 自動化」4 天工作坊的互動教學網頁 + 課程包。**純靜態前端 + Playwright 爬蟲腳本**，無框架、無 bundler、無建置流程。改完 `course-data.js` 或 `index.html` 直接重新整理瀏覽器即可看到結果。

## 常用指令

```powershell
# 啟動本地伺服器（必要：localStorage 在 file:// 下會被 Chrome 阻擋）
npm run serve                    # → http://localhost:3000

# 重新抓取講師 YouTube 頻道資料（產出 data/instructor.json + instructor-data.js）
npm run scrape:instructor

# 重新抓取 6 個 AI 工具首頁截圖（產出 data/tools/*.png + tools-data.js）
npm run scrape:tools                                  # 全自動 headless 跑全部
node scripts/scrape-tools.mjs --ids codex,notebooklm  # 只跑指定工具，合併寫回（不覆蓋其他）
node scripts/scrape-tools.mjs --headed --pause        # 半自動：顯示瀏覽器、截圖前等 Enter
node scripts/scrape-tools.mjs --cdp --pause           # CDP 模式：連接已啟動的真實 Chrome
                                                      # （繞反爬偵測，前置：scripts/start-cdp-chrome.ps1）

# 視覺驗證（需先 npm run serve；驗證渲染與 Day 篩選功能）
URL=http://localhost:3000/ node scripts/verify-toolbox.mjs
URL=http://localhost:3000/ node scripts/verify-instructor-card.mjs

# 把 完整課程包/教學素材/*.md 重建成 pdf/*.pdf（pandoc + Edge headless）
pwsh -File 完整課程包/教學素材/_build/build-pdf.ps1
```

> **環境**：Windows + PowerShell 7+。Bash 介面以 Unix 路徑為主，但 `pwsh` 指令需 PowerShell。中文路徑（`完整課程包/`）在 shell 中要加引號。

## 架構

### 資料流

```
window.COURSE      ← course-data.js   (4 天大綱 / units / prompts / tasks / materials / quiz)
window.INSTRUCTOR  ← instructor-data.js (由 scrape-youtube-channel.mjs 自動產生)
window.TOOLS       ← tools-data.js     (由 scrape-tools.mjs 自動產生)
       ↓
   index.html 內聯的 init() 用一連串 renderXxx() 函式組裝出整個 SPA
       ↓
   localStorage：mor3xppa-progress-v1（任務勾選 + 測驗作答 + 主題）
                content-zoom-v1（sidebar 上的內容縮放偏好）
```

`index.html` 的 JS 區塊（約從 1700 行起）內含完整應用：

| 區塊 | 行數 | 重點函式 |
|---|---|---|
| 工具與資料 store | ~1690 | `el()` DOM helper、`store.load/save/reset` |
| 縮放控制 | ~1800 | 寫入 `--content-zoom` CSS 變數，sidebar 不受影響 |
| 渲染管線 | ~2080–2900 | `renderOverview / renderSharedCase / renderDay / renderUnit / renderMaterials / renderToolbox / renderQuiz` |
| 互動狀態 | ~2900–3030 | `renderSidebar / setupScrollSpy / applyTheme / setupFadeIn` |
| init 入口 | ~3029 | 串起所有 render，最後 `setupScrollSpy()` 啟用導覽高亮 |

### 跨檔資料對應

| course-data.js 路徑 | 顯示位置（index.html） |
|---|---|
| `meta.days[]` | sidebar 章節 + Day Hero 統計 |
| `dayN.units[]` | 每天 accordion 單元 |
| `dayN.units[].tasks[]` | 任務勾選清單（**id 是 localStorage 鍵**） |
| `dayN.units[].prompts[]` | RTFC 提示詞卡（含複製按鈕） |
| `dayN.units[].materials[]` | 單元下方素材列表 |
| `materials[]` | 「教學素材總覽」章節（跨 4 天彙整） |
| `quiz[]` | 結訓測驗章節 |

### 素材路由：`getMaterialUrl(name, type)`

集中定義在 [index.html](index.html#L1855)，依 `type` 決定 URL 與下載行為：

- `type === 'PDF 文件'` → `完整課程包/教學素材/pdf/xxx.pdf`，渲染時加 `download` 屬性觸發下載
- 其他類型（TEXT / CSV / YAML / MD）→ `完整課程包/教學素材/xxx.{md,csv,yaml}`，`target="_blank"` 開新分頁
- 新素材檔需在 **3 個地方**同步更新：
  1. 把實體檔案放到 `完整課程包/教學素材/` 下
  2. 在 `course-data.js` 的對應 `materials[]` 加入條目（`{ id, name, type, desc }`）
  3. 在 `getMaterialUrl()` 加上 `name.includes('關鍵詞')` 對應規則

## 修改時的關鍵約束

### Task ID 是 localStorage 鍵（**永遠不要重新命名**）

任務 ID 命名規則：`d{n}-u{n}-t{n}` 或 `day{n}-u{n}-t{n}`（兩種格式並存）。**已發布後改名會讓所有學員的勾選進度錯位**。安全做法：刪掉舊 ID 條目、新增新 ID，不重用。

### Quiz 重編號要兩處同步

`course-data.js:quiz[]` 的 `qN` 是顯示編號；`index.html:qIndexToDay()` 同樣以 `qN` 為鍵指回章節。**刪題 / 重編號時兩處必須同時改**，否則送出測驗後章節指引會錯位。同時要更新 `index.html` 內 5 處硬編碼總題數：標題「結訓測驗（N 題）」、lead 文字、「— / N」分數顯示（兩處）、`toast` 訊息、及格判斷 `s >= K`。

### Sidebar 是 `position: fixed`，不是 `sticky`

[index.html](index.html) 的 `.sidebar` 採用 `position: fixed; left: 0; top: 0` 並讓 `.main` 加 `margin-left`。改回 sticky 會踩到坑：`.app { overflow-x: hidden }` 會讓瀏覽器 implicit 把 `overflow-y` 設為 `auto`，導致 window 不再捲動、`topbar` 的 sticky 也會失效。**保持 fixed**。

### 內容縮放只套在 `.content`

`html` 不能再加 `zoom: X`（會導致 sidebar 跟著被縮放，且與 `.content` 的 zoom 疊乘）。控制在 `:root` 上的 CSS 變數 `--content-zoom`，sidebar 完全不引用此變數。

## 課程內容資料夾

```
完整課程包/
├── 課程總覽.md / 課程輔助文件.md / 共用案例設定.md
├── Day1~4 各自的 課程大綱.md / 課程內容.md（講師講義）
└── 教學素材/
    ├── *.md / *.csv / *.yaml          ← 學員素材原始檔
    ├── pdf/*.pdf                      ← 由 _build/build-pdf.ps1 產出
    └── _build/build-pdf.ps1 + style.css
```

`course-data.js` 內的學習目標、時程、提示詞文字必須與對應 `Day{n}/課程內容.md`、`Day{n}/課程大綱.md`、`課程總覽.md` 保持同步。修改一處時記得連動掃過：時數、上課時間、單元時間 chunk、任務說明等都會出現在 4~5 個地方。

## 講師 / 工具資料的爬蟲特性

`scripts/scrape-youtube-channel.mjs` 抓的是「**最熱門影片**」，做法是抓 30 部最新影片再依觀看數本地排序（YouTube SPA 會 strip `?view=0&sort=p`，URL 排序失效）。縮圖用 `https://img.youtube.com/vi/{videoId}/hqdefault.jpg` 從 URL 反推（不依賴 DOM `<img src>`，因 virtual scrolling 會釋放捲出視野元素的 src）。

`scripts/scrape-tools.mjs` 對「OpenAI / ChatGPT」這類有反爬偵測的網站，必須用 CDP 模式連到真實 Chrome：先跑 `scripts/start-cdp-chrome.ps1` 啟動 `--remote-debugging-port=9222`，再用 `--cdp --pause` 旗標執行。

## 開啟方式

開發時統一用 `npm run serve` 而非雙擊 `index.html` — Chrome 在 `file://` 協定下會擋 localStorage，導致進度與設定無法保存。

詳細功能列表、互動行為、課程資料來源請參見 [README.md](README.md)。
