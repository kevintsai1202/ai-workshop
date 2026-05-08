<!--
Agent Skill 範本：發票自動整理
依 agentskills.io 官方規範撰寫（YAML frontmatter + Markdown body）。

使用方式：
1. 建立資料夾 `invoice-to-excel/`（資料夾名 = name 欄位，必須相同）
2. 把下方分隔線之間的 SKILL.md 內容存成 `invoice-to-excel/SKILL.md`
3. 可選：建立 `references/` 子目錄並把公司差勤辦法 PDF 放進去
4. 在 Codex / Claude / 其他 agent 中提及任務即可自動觸發

請勿改 name 欄位，除非同時改資料夾名（兩者必須相同）。
-->

# 範本：發票自動整理 SKILL.md

```markdown
---
name: invoice-to-excel
description: 把多張發票照片辨識並整理成 Markdown 表格，含日期、金額、商家、品項、報支科目，並自動標示違規（如餐飲超過 150 元）。使用時機：每月報帳、整理收據、或需要稽核同事報帳合規性時。
---

# 發票自動整理

## 角色與任務

你是專業且嚴謹的財務稽核專員。請辨識使用者上傳的發票照片，並整理成 Markdown 表格。

## 輸出格式

| 報帳日期 | 商家名稱 | 發票號碼 | 金額（含稅） | 品項摘要 | 報支科目 | 合規檢查 |
| --- | --- | --- | --- | --- | --- | --- |

## 處理規則

1. **報支科目**：根據品項自動分類（交通費、誤餐費、辦公用品等）
2. **合規檢查**：
   - 餐飲超過 150 元 → 標示「❌ 違規超標」
   - 高鐵票 → 標示「✅ 符合」
   - 其他依公司差勤辦法判斷
3. **無法辨識**：填「待人工確認」

## 知識來源

請參考 `references/expense-policy.pdf`（公司差勤辦法第二章）。

## 邊界情況

- 圖片模糊或無法辨識金額 → 標示「待人工確認」並繼續處理其他發票
- 同一張圖片含多張發票 → 拆分為多列輸出
- 非繁體中文發票（如英文收據）→ 嘗試辨識並用半形數字輸出，金額單位另開欄位
```

---

## 資料夾結構（建議）

```text
invoice-to-excel/
├── SKILL.md              ← 上方範本內容
├── references/
│   └── expense-policy.pdf ← 公司差勤辦法（依需求加入）
└── (assets/、scripts/ 視需要建立)
```

## 命名規則（必看）

`name` 欄位與資料夾名稱：

- ✅ 1-64 字
- ✅ 全部小寫字母 + hyphen
- ❌ 不可底線（`auto_invoice` ✗）
- ❌ 不可大寫（`Invoice-Excel` ✗）
- ❌ 不可連續 hyphen（`pdf--parser` ✗）
- ❌ 不可首尾 hyphen（`-invoice` 或 `invoice-` ✗）

違規會讓 skill 載不進去。

## 觸發機制（progressive disclosure）

agent 啟動時只讀所有 skills 的 `name` + `description`（每支約 100 tokens），匹配到才載入完整 SKILL.md body。所以 `description` 必須同時說明：

- **做什麼**（task）
- **什麼時候用**（trigger context）

寫得越具體、含關鍵字，AI 越精準觸發。

## 推薦：用 skill-creator 寫你自己的 Skill

不確定怎麼下筆？安裝官方 meta-skill：

```bash
npx skills add https://github.com/anthropics/skills --skill skill-creator
```

它會問你 5-7 題引導你產出符合官方規範的 SKILL.md，並可選跑 description 觸發測試。

## 參考資料

- [agentskills.io 官方規範](https://agentskills.io/specification)
- [Quickstart](https://agentskills.io/skill-creation/quickstart)
- [skills.sh — 跨工具 Skills 寶庫](https://skills.sh)
