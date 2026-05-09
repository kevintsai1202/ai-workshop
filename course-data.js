// 課程資料總表 — 從《mor3xppa-完整課程包》整理而來
// 結構：sections[] -> 每節（總覽/共用案例/Day1~4/教學素材/測驗）
// 每天的 units[] 包含：title、time、goals、concepts、prompts、tasks、materials
// 任務 id 命名：dN-uM-tK（Day N 單元 M 任務 K），用於 localStorage 進度持久化

window.COURSE = {
  meta: {
    title: '行政與財務流程 AI 自動化',
    subtitle: '打造高效能行政財務 AI 部隊（臺北班）',
    program: '115-116 年度強化服務業人才韌性計畫',
    organizer: '經濟部商業發展署 ｜ 商業服務業 AI 人才辦公室',
    dates: '115/5/13、5/20、5/27、6/3（每週三 09:00 ~ 16:30）',
    location: '台北市電腦商業同業公會（松山區八德路三段 2 號 B103 教室／5/13 報到教室）+ Cisco Webex 線上直播',
    mapUrl: 'https://maps.app.goo.gl/DYzX49jooACr4ahm7',
    format: '混成課程，共 30 小時（含數位自學 4 小時）',
    instructor: '蔡承凱（凱文大叔）｜泰博科技 PLM 技術主任',
    completion: ['出席時數達 80% 以上', '完成前後測考試'],
    objectives: [
      '運用 AI 完成公告改寫、文案生成與會議錄音摘要。',
      '透過 AI 製作海報、投影片與宣傳影片等多媒體素材。',
      '利用 NotebookLM 進行發票辨識、表單整理與資料轉 Excel。',
      '理解 Antigravity、Codex 與 Agent Skills，能設計並製作專屬的 AI 自動化技能。'
    ],
    days: [
      { id: 'day1', n: 1, date: '5/13', title: '產業趨勢與 AI 基礎入門', hours: 6.5 },
      { id: 'day2', n: 2, date: '5/20', title: 'AI 多媒體內容製作', hours: 6.5 },
      { id: 'day3', n: 3, date: '5/27', title: '行政文件與財務資料整理', hours: 6.5 },
      { id: 'day4', n: 4, date: '6/3', title: 'AI 代理協作、成果展示與小測驗', hours: 6.5 }
    ]
  },

  // 共用案例：兩個品牌 + 三個角色
  sharedCase: {
    intro: '4 天課程共用的虛構品牌與角色設定。所有講師示範與學員實作，皆以此為情境基礎。學員可依自身產業二選一帶入。',
    brands: [
      {
        id: 'A',
        name: '暖光咖啡 Warm Light Coffee',
        type: '餐飲｜單店咖啡廳',
        rows: [
          ['業態', '單店獨立咖啡廳，午餐輕食 + 手沖咖啡'],
          ['地點', '台北市信義區'],
          ['員工', '全職 3 人、兼職 5 人'],
          ['主要客群', '鄰近上班族、假日週邊住戶'],
          ['行政痛點', '員工排班公告、月結進貨發票、會議紀錄、Google 評論回覆']
        ]
      },
      {
        id: 'B',
        name: '綠野選物 GreenField Select',
        type: '零售｜小型生活選品店',
        rows: [
          ['業態', '3 家門市的生活選物零售（餐廚、香氛、文具）'],
          ['地點', '雙北 3 家門市'],
          ['員工', '總部 4 人、門市每店 2~3 人'],
          ['主要客群', '25-40 歲女性、送禮族'],
          ['行政痛點', '多店進貨單彙整、新品上架公告、教育訓練手冊、客訴處理']
        ]
      }
    ],
    roles: [
      ['阿凱', '暖光咖啡', '店長', '餐飲案例的提問者 / 操作者'],
      ['小美', '綠野選物', '行政主管', '零售案例的提問者 / 操作者'],
      ['老闆 / 主管', '兩家共用', '高層', '提出指令的角色（用以模擬「老闆要的東西」情境）']
    ],
    variables: [
      ['{店名}', '暖光咖啡', '綠野選物'],
      ['{產品}', '季節限定手沖', '春季新品香氛蠟燭'],
      ['{對象}', '鄰近上班族', '25-40 歲女性'],
      ['{場景}', '平日午後', '假日週末'],
      ['{語氣}', '溫暖、親切', '文青、療癒']
    ],
    tools: [
      ['Gemini', '文案撰寫、改寫、長文摘要、生圖（Nano Banana）、生投影片（Canvas）；**免費版**：30 prompts/日 + 20 圖/日 + 5 Deep Research/月', 'Day 1、2、3'],
      ['Flow', 'AI 影片工具（Nano Banana 生圖 + Veo 生影片）；**免費版**：50 credits/日 ≈ 12 段 8 秒影片', 'Day 2'],
      ['NotebookLM', '來源資料整理、會議錄音摘要、發票辨識；**免費版**：50 對話/日 + 3 Audio Overview/日 + 50 sources/notebook', 'Day 1、3'],
      ['Antigravity', 'Agent 協作、Skill 執行環境', 'Day 1、4'],
      ['Codex', '程式碼/腳本生成、Skill 開發輔助', 'Day 1、4']
    ],
    deliverables: [
      ['Day 1', '個人提示詞庫（公告、通知、會議紀錄各 1 份）'],
      ['Day 2', '海報草稿、投影片初稿、Flow 產出的 8-16 秒短影片'],
      ['Day 3', '會議紀錄範本、FAQ 初稿、發票 Excel 範本'],
      ['Day 4', '個人化 Agent Skill（將 Day 1~3 的提示詞封裝成可重用技能）']
    ]
  },

  // ========== Day 1 ==========
  day1: {
    id: 'day1',
    title: 'Day 1｜產業趨勢與 AI 基礎入門',
    date: '5/13（六） 09:00 ~ 16:30',
    hours: '6.5 小時',
    learningGoal: '建立 AI 工具的基本認知，能分辨「模型」（Gemini / GPT）與「工具」（Gemini App、NotebookLM、Antigravity、Codex 等）的差異，完成 Gemini / NotebookLM / Codex 的帳號登入並下載第四天會用到的 Antigravity，並透過提示詞與行政應用示範，初步將 AI 應用於日常公告與會議文件處理。',
    schedule: [
      ['09:00 ~ 10:00', '開場 + 破冰', '課程說明、學員自我介紹與痛點盤點'],
      ['10:00 ~ 12:00', '單元 1：AI 基礎與多工具', '模型 vs 工具、Gemini vs ChatGPT、多工具定位、帳號註冊'],
      ['12:00 ~ 13:00', '午休', '（自理午餐）'],
      ['13:00 ~ 14:00', '單元 2 上半：提示詞入門', 'RTFC 四要素 + 公告示範'],
      ['14:00 ~ 15:30', '單元 2 下半：行政實作', '口語改寫公告 + 長文摘要'],
      ['15:30 ~ 16:30', '單元 3：Gem 介紹與實作', 'Gem 三大來源 + 自訂 Gem 親手做']
    ],
    units: [
      {
        id: 'u1',
        title: '單元 1｜AI 基礎概念與多工具定位',
        time: '10:00 ~ 12:00',
        goals: [
          '用一句話說明「生成式 AI」是什麼。',
          '分得清「模型」與「工具」的差別。',
          '知道 Gemini 與 ChatGPT 兩大模型的差異與適用場景。',
          '知道 Gemini / NotebookLM / Flow / Antigravity / Codex 各自的定位差異。',
          '完成 4 個工具的帳號註冊與登入。'
        ],
        concepts: [
          {
            heading: '行政 / 財務 AI 應用趨勢（2026）— 為什麼這 4 天值得來',
            illustration: 'day1-industry-trends-2026',
            body: 'AI 工具導入企業的速度比想像快——**91% 企業已用 AI**（2023 年僅 55%）。對行政與財務工作來說，這不是「未來的事」而是「現在的標配」。**重點不是 AI 會不會取代你，而是「會用 AI 的同事正在比你少花 2-3.5 小時/週」。**',
            table: {
              head: ['指標', '數據', '對行政學員的意義'],
              rows: [
                ['🌐 全球企業 AI 採用率', '91%（2026）／ 78%（2024）／ 55%（2023）', '從「先進企業專屬」變成「同事都在用」'],
                ['⏱ 行政文書平均工時節省', '**2-3.5 小時/週**', '一週多出半天可做更高價值的工作'],
                ['💰 企業 AI 投資回報', '每 $1 投入 → $3.70 產出', '公司有理由持續投入 AI 工具預算'],
                ['🇹🇼 台灣企業 AI 導入率', '約 30%（連兩年）', '台灣略落後全球，**政府正大力推**（含本課程）'],
                ['🏢 Microsoft 365 Copilot', '2,000 萬付費企業席次（2026/4）', '七個月翻倍 — Office 全家桶 AI 化是大勢'],
                ['🔍 HR 履歷 AI 用率', '58%（2026） vs 35%（2023）', '**行政相關職能 AI 滲透速度最快**']
              ]
            },
            list: [
              ['📌 行政人員 AI 三大應用', '流程自動化、決策支援、文件處理（依台灣產業 AI 化大調查）'],
              ['📌 財務具體場景', 'AI agent 自動匹配發票 ↔ 分錄、即時標記異常 — 從「小時」縮為「秒」'],
              ['📌 政府支持', '經濟部「服務業 AI 人才培育計畫」、數發部「AI 產業生態人才賦能計畫」（**本課程屬於這類補助案**）'],
              ['📌 趨勢底線', '工作不會消失但會「**重塑**」— 文書時間↓、規劃 / 溝通 / 把關時間↑']
            ],
            note: '📊 **資料來源**（2026 主要調查）：[Federal Reserve Notes（2026/4）](https://www.federalreserve.gov/econres/notes/feds-notes/monitoring-ai-adoption-in-the-u-s-economy-20260403.html)、[Microsoft 365 Copilot 20M Seats（2026/4/29）](https://news.microsoft.com/source/features/digital-transformation/accenture-is-rolling-out-copilot-to-a-workforce-the-size-of-denver/)、[台灣產業 AI 化大調查（AIF）](https://aif.tw/event/ai-research/)、[BCG: AI Will Reshape More Jobs Than It Replaces](https://www.bcg.com/publications/2026/ai-will-reshape-more-jobs-than-it-replaces)。'
          },
          {
            heading: 'A. 生成式 AI 的本質：機率預測機',
            body: '別把 AI 當神，它是「接龍機」：你給它一段話，它預測下一個字最可能是什麼，然後一直接下去。',
            illustration: 'day1-token-prediction',
            list: [
              ['擅長', '歸納、改寫、模仿風格、找模式'],
              ['不擅長', '精準計算、即時資訊、判斷對錯']
            ],
            note: 'AI 是助手，不是答案機。永遠人在迴圈裡（Human in the Loop）。'
          },
          {
            heading: 'B. 模型 vs 工具：別把兩個層級搞混',
            illustration: 'day1-models-vs-tools',
            table: {
              head: ['層級', '你看到的', '實際是什麼', '比喻'],
              rows: [
                ['模型', 'GPT-5、Gemini 2.5 Pro、Claude 4', 'AI 的「大腦」', '引擎'],
                ['工具', 'ChatGPT App、Gemini App、NotebookLM、Flow、Antigravity', '包裝模型的「介面」', '車身']
              ]
            },
            note: '同一台引擎可以裝在不同車身；同一台車身裡也可以換不同引擎。'
          },
          {
            heading: 'C. 兩大主流模型對比：Gemini vs ChatGPT',
            table: {
              head: ['維度', 'Gemini（Google）', 'ChatGPT / GPT（OpenAI）'],
              rows: [
                ['多模態', '⭐ 原生多模態，圖片影片直接懂', '讀取部分略遜，但生圖已追上'],
                ['長文處理', '⭐ Context window 高達 1M~2M tokens', '通常 128K~400K'],
                ['推理能力', '強（傳統印象稍弱）', '⭐ o1/o3/GPT-5 推理頂尖'],
                ['Workspace 整合', '⭐ Gmail、Docs、Drive 直接呼叫', '需第三方插件'],
                ['免費版額度', '⭐ 大方', '較緊'],
                ['繁中表現', '⭐ 台灣語境自然', '不錯但偶有中國用語'],
                ['本課程使用', '⭐ 主力', '補充工具']
              ]
            },
            note: 'Gemini = 長文 + 影音 + 與 Google 整合，行政人員的甜蜜點；ChatGPT = 深度推理 + 生態系。'
          },
          {
            heading: 'D. 為什麼本課程主推 Gemini？',
            list: [
              ['免費版夠用', '完整跑完 4 天課程不需付費'],
              ['NotebookLM 同源', 'Google 自家，行政場景無可替代'],
              ['🔗 雙向同步 Notebook（2026/4 新功能）', 'Gemini 側欄與 NotebookLM 共用同一個 notebook — sources、custom instructions 雙向同步。**同一份規章可在 Gemini 端混搭 web 搜尋寫公告、在 NotebookLM 端用 Studio 生 Audio Overview**（Day 3 詳細介紹）'],
              ['Workspace 深度整合', '90% 行政人員天天用 Gmail / Docs / Drive'],
              ['中文長文強', '會議紀錄、長公告等台灣行政場景']
            ]
          },
          {
            heading: 'D-1. Gemini 介面導覽（第一次打開看到什麼）',
            illustration: 'day1-gemini-ui',
            body: 'gemini.google.com 是學員打字的第一站。畫面分三區：左側 sidebar（歷史對話 + 設定）、頂端 nav（關於 / 應用程式 / 訂閱 / 企業用途）、中央 chat input + 四個模式按鈕（撰寫 / 方案 / 研究 / 學習）。',
            list: [
              ['Chat input', '中央輸入框 — Gemini 主舞台。打字送出'],
              ['四個模式按鈕', '撰寫 / 方案 / 研究 / 學習 — 不同模式有不同 prompt 模板，輕鬆切換用途'],
              ['新對話按鈕', '左側 sidebar **上方**的「新對話」按鈕 — **新題目務必開新對話**，避免歷史污染答案'],
              ['左側 sidebar', '展開可看歷史對話清單、設定、Gem 庫'],
              ['頂端「登入」', '需 Google 帳號（建議用個人 Gmail，公司 Workspace 帳號可能受 IT 政策限制）']
            ],
            note: '行政學員優先級：先學會「+ 新對話」+「四個模式按鈕」即可上手。常見錯誤：所有問題都接在同一對話 → 答案越來越偏；應該每個新題目開新對話。'
          },
          {
            heading: 'E. 為什麼要學「多工具」？',
            table: {
              head: ['工具', '一句話定位', '行政場景對應'],
              rows: [
                ['Gemini', '通用對話與內容生成', '寫公告、改文案、長文摘要'],
                ['Flow', 'Google AI 影片工具（Nano Banana 生圖 + Veo 生影片）', '製作門市開幕／新品宣傳的 8-16 秒短影片'],
                ['NotebookLM', '以你提供的資料為唯一來源的 AI 筆記本', '會議錄音轉摘要、發票辨識、企業內部資料整理'],
                ['Antigravity', '桌面型 AI 代理（IDE-like），可幫你自動跑流程', '把多步驟工作打包成 Skill 自動執行'],
                ['Codex', '偏程式碼與腳本生成的 AI 工具', '能在電腦處理的工作都能交給它']
              ]
            }
          },
          {
            heading: 'F. NotebookLM：行政人員的神器',
            body: 'NotebookLM 與 Gemini 的關鍵差異：它只會根據你給它的資料回答。',
            list: [
              ['你給它 5 份文件', '它就只看這 5 份'],
              ['不會幻想', '不會引用網路上的資訊'],
              ['對行政與財務工作', '無可取代的優點：不能讓 AI 幻想出公司沒有的數據'],
              ['也是優秀的學習工具', '把講義／書籍／論文丟進去就能對話問答、產生摘要與 podcast（本課僅點到為止）']
            ],
            note: '🔗 **Day 3 會講進階用法**：包含介面導覽、規章三步驟、Citation 驗證，以及 2026/4 新推出的「**Gemini × NotebookLM 雙向同步 notebook**」— 同一份規章可在兩端切換使用，Gemini 端混搭網路知識寫公告、NotebookLM 端用 Studio 生 Audio Overview。'
          }
        ],
        prompts: [],
        tasks: [
          { id: 'd1-u1-t1', label: '完成 Gemini 帳號登入（gemini.google.com）' },
          { id: 'd1-u1-t2', label: '完成 NotebookLM 登入（notebooklm.google.com）' },
          { id: 'd1-u1-t3', label: '下載安裝 Antigravity（第四天課程會用到的工具，可先安裝）' },
          { id: 'd1-u1-t4', label: '完成 Codex 帳號註冊（chatgpt.com / OpenAI）' }
        ],
        faq: [
          ['免費版會不會不夠用？', '整個課程都用免費額度可完成；額度不夠時老師會教降級方案。'],
          ['資料會不會被拿去訓練？', 'Google 商用條款下不會；建議真實機敏資料先去識別化。'],
          ['可以用公司信箱註冊嗎？', '可以但不建議，IT 政策會擋；課程一律建議用個人 Google 帳號。'],
          ['為什麼不教 ChatGPT？', 'ChatGPT 課後當然可用，但行政場景下 NotebookLM 的「只看來源」特性不可取代。']
        ]
      },
      {
        id: 'u2',
        title: '單元 2｜提示詞入門 + 行政應用實作',
        time: '13:00 ~ 15:30',
        goals: [
          '能說出提示詞的四要素：角色、任務、格式、限制（RTFC）。',
          '看到一段爛提示詞能立刻指出缺哪一塊。',
          '能依公告 / 通知 / 會議紀錄三種文件類型寫出對應提示詞。',
          '能用 AI 將口語內容改寫為正式公告。',
          '能用 AI 將長文整理出重點摘要。'
        ],
        concepts: [
          {
            heading: 'RTFC 提示詞四要素',
            body: 'R(ole) 角色 + T(ask) 任務 + F(ormat) 格式 + C(onstraint) 限制。',
            list: [
              ['❌ 爛提示詞', '幫我寫個咖啡廳的公告 → AI 給你八股、不知道用在哪'],
              ['✅ 好提示詞', '完整 RTFC：誰寫、寫什麼、什麼格式、什麼限制']
            ]
          },
          {
            heading: 'Few-shot Prompting：給範例比給規則有效',
            body: '想要 AI 寫出某種風格 → 直接貼一篇你過去寫過、覺得不錯的範例給它，比解釋風格更快。'
          }
        ],
        prompts: [
          {
            id: 'd1-p1',
            title: 'A. 公告類（暖光咖啡）',
            note: '把口語廢話改寫成可貼出去的 FB 公告',
            text: `角色：你是「暖光咖啡」店長，需要對顧客發布訊息。
任務：撰寫一篇「7/1 起店休調整為週二公休」的公告。
格式：FB 貼文格式，含 1 個 emoji 開頭、3 段內容、結尾感謝詞。
限制：150 字內，語氣親切但專業，不要使用驚嘆號超過 2 個。`
          },
          {
            id: 'd1-p2',
            title: 'B. 通知類（綠野選物）',
            note: '對 3 家門市同仁發內部 Email',
            text: `角色：你是「綠野選物」總部行政主管，要對 3 家門市同仁發內部 Email 通知。
任務：通知 8/15 全員教育訓練，地點台北總部，時間 14:00-17:00。
格式：Email 標準格式（主旨 + 收件對象 + 內文 + 行前須知 4 點 + 簽名）。
限制：正式語氣、條列清楚，內文 250 字內。`
          },
          {
            id: 'd1-p3',
            title: 'C. 會議紀錄類（暖光咖啡）',
            note: '從錄音逐字稿整理為正式會議紀錄',
            text: `角色：你是會議紀錄專員。
任務：根據以下會議口述內容，整理成正式會議紀錄。
[此處貼上錄音逐字稿或口述稿]
格式：會議紀錄五段式（時間/出席/議題/決議/待辦）。
限制：決議與待辦務必標明負責人與期限；原文沒講的不要自己補。`
          },
          {
            id: 'd1-p4',
            title: 'D. 長文摘要範本（用於實作 2）',
            note: '把員工差勤辦法整理成 5 段式摘要',
            text: `角色：你是「{店名}」的行政助理，要把一份冗長文件濃縮給店長看。
任務：請把以下文章整理成 5 段式摘要：
  1. 一句話總結（20 字內）
  2. 三個重點（每點 50 字內）
  3. 對「{店名}」的影響（兩句話）
  4. 建議行動（1-3 點）
  5. 不確定 / 需釐清的地方（1-2 點）
格式：標題用 emoji 開頭、條列清楚。
限制：原文沒提到的不要自己補；若有不確定，明確寫「需要進一步確認」。
[此處貼上原文]`
          }
        ],
        tasks: [
          { id: 'd1-u2-t1', label: '實作 1：用 RTFC 把老闆口語稿改寫成 200 字內的公告（見素材）' },
          { id: 'd1-u2-t2', label: '實作 2：用 Gemini 把員工差勤辦法整理成 5 段式摘要' },
          { id: 'd1-u2-t3', label: '小練習：救救爛提示詞 — 把 3 段爛提示詞補成完整 RTFC' }
        ],
        materials: [
          { id: 'd1-m0', name: '品牌調性指南', type: 'TEXT', desc: '⭐ 寫公告前先讀：兩個品牌的核心人格、語氣關鍵字、雷區、好 vs 壞範例' },
          { id: 'd1-m1', name: '老闆口語稿（公告改寫）', type: 'TEXT', desc: '老闆口氣的口語錄音稿，用於改寫成正式公告' },
          { id: 'd1-m2', name: '綠野選物_員工差勤與休假管理辦法', type: 'PDF 文件', desc: '七章二十六條，3000 字，行政人員每年都嫌長的代表性文件' },
          { id: 'd1-m3', name: '綠野選物_新進員工教育訓練手冊', type: 'PDF 文件', desc: '進階備援：7000 字、跨 14 章，挑戰真．大檔案摘要能力' },
          { id: 'd1-m4', name: '3 段爛提示詞', type: 'TEXT', desc: '故意各缺不同 RTFC 要素的提示詞，學員練習補完整（含修法線索表）' }
        ]
      },
      {
        id: 'u3',
        title: '單元 3｜Gem 介紹與實作',
        time: '15:30 ~ 16:30',
        subtitle: '本日壓軸：把 RTFC 提示詞封裝成 Gemini 內的小助手',
        goals: [
          '用一句話說明 Gem 是什麼（與 GPTs / Skill 的對應關係）。',
          '認識 Gem 的三大來源：官方預建立 / 自訂 / Google Labs。',
          '親手把今天寫的提示詞封裝成第一個自訂 Gem。'
        ],
        concepts: [
          {
            heading: 'Gem 是什麼',
            body: 'Gem = Gemini App 內的「客製化小助手」，把你常用的提示詞、角色、知識來源，封裝成一個可一鍵呼叫的工具。',
            table: {
              head: ['平台', '對應名稱'],
              rows: [
                ['Gemini App', 'Gem'],
                ['ChatGPT', 'GPTs'],
                ['Antigravity / Claude', 'Skill（Day 4 會學）']
              ]
            }
          },
          {
            heading: 'Gem 的三大來源',
            table: {
              head: ['類型', '來源位置', '適合對象'],
              rows: [
                ['1️⃣ 官方預建立 Gem', 'Gemini App 側邊欄已內建', '入門者'],
                ['2️⃣ 自訂 Gem', 'Gem 管理工具 → 新增 Gem', '行政應用主力（今天親手做）'],
                ['3️⃣ Google Labs 的 Gem', 'labs.google', '進階嘗鮮者（課後自學）']
              ]
            }
          },
          {
            heading: '建立自訂 Gem 的 5 步驟',
            list: [
              ['步驟 1', 'Gemini App 左側邊欄 → 「Gem 管理工具」 → 「新增 Gem」'],
              ['步驟 2', '名稱：暖光咖啡行政小幫手（越具體越好）'],
              ['步驟 3', '指令：貼上今天實作 1 的 RTFC 提示詞與範例輸出後修改 — **每次會變動的部分（日期 / 主題 / 對象等）改成 `{變數}` 佔位符**，下次呼叫時 Gem 會主動詢問'],
              ['步驟 4', '知識（選填）：上傳 1 份品牌調性手冊 / 過去公告範本'],
              ['步驟 5', '儲存 → 右側預覽窗測試「幫我寫明天店休公告」']
            ],
            note: '一個 Gem 一個任務，多任務反而效果差。'
          }
        ],
        prompts: [],
        tasks: [
          { id: 'd1-u3-t1', label: '從今天寫過的提示詞挑 1 條最常用的，建一個自訂 Gem' },
          { id: 'd1-u3-t2', label: '用真實情境（例如：明天的店休公告）測試一次' },
          { id: 'd1-u3-t3', label: '舉手宣告：我有自己的 Gem 了 ✋' }
        ],
        faq: []
      }
    ],
    homework: [
      '把今天用過的提示詞庫**全部封裝成 Gem**（每條提示詞 → 1 個專屬 Gem，方便日後一鍵呼叫）。',
      '回家用 AI 改寫一篇你過去寫過、現在看會臉紅的舊公告。**有問題直接在群組提出**，不用帶到下週上課。',
      '預習 Day 2：去看 1 支「咖啡廳/零售店」的 60 秒短影片，思考裡面的鏡頭怎麼分鏡。'
    ],
    expected: [
      '完成所有 AI 工具的帳號註冊與登入。',
      '能撰寫含有角色 / 任務 / 格式限制的提示詞。',
      '能用 AI 將口語內容改寫為正式公告，並將長文整理出重點摘要。',
      '建立第一個自訂 Gem，將今日提示詞封裝為可重複呼叫的工具。'
    ]
  },

  // ========== Day 2 ==========
  day2: {
    id: 'day2',
    title: 'Day 2｜AI 多媒體內容製作',
    date: '5/20（六） 09:00 ~ 16:30',
    hours: '6.5 小時',
    learningGoal: '以 Google 生態 AI 工具產出實際可用的多媒體素材（海報、投影片、宣傳影片），理解 AI 影片「圖片→影片」的核心原理，並完成個人化 8-16 秒短片成品（IG Reels / TikTok 黃金長度）。',
    principle: '本日工具原則：全程在 Gemini App 內完成圖文 + Flow 做影片，不切到 Google Slides / Word / 第三方軟體。',
    schedule: [
      ['09:00 ~ 09:30', '快速複習 + Day 1 回顧', '提示詞庫分享、痛點打卡'],
      ['09:30 ~ 12:00', '單元 1：海報 + 投影片實作', 'Nano Banana 出海報、Canvas 直接生 .pptx'],
      ['12:00 ~ 13:00', '午休', ''],
      ['13:00 ~ 14:00', '單元 2 上半：影片基本概念 + Flow 介紹', 'PASA、圖片→影片原理'],
      ['14:00 ~ 16:30', '單元 2 下半：Flow 影片實作', '8-16 秒短片成品 + 個人完善']
    ],
    units: [
      {
        id: 'u1',
        title: '單元 1｜海報 + 投影片實作（純圖文）',
        time: '09:30 ~ 12:00',
        goals: [
          '知道 AI 在「圖文素材」這個層面能幫到什麼程度。',
          '用 Gemini Nano Banana 產出一張可用的活動海報。',
          '用 Gemini Canvas 直接生成 8 頁投影片並下載為 .pptx。',
          '理解「AI 出圖不是按一次就好」——它是反覆對話的過程。'
        ],
        concepts: [
          {
            heading: 'AI 多媒體製作的「三層分工」',
            table: {
              head: ['層次', '工作內容', 'AI 角色', '你的角色'],
              rows: [
                ['腳本/文案層', '想標語、寫文案、規劃結構', '主力（90%）', '確認方向'],
                ['視覺生成層', '出圖、配色、排版', '主力（70%）', '給範例、調整'],
                ['微調/輸出層', '改字、換 Logo、輸出規格', '輔助（30%）', '主力（仍需動手）']
              ]
            },
            note: '不要期待按一次按鈕就完美。AI 給你的是 80 分初稿，你補最後 20%。'
          },
          {
            heading: '工具地圖（本日 Google 三件套）',
            table: {
              head: ['任務', '工具', '為什麼用它'],
              rows: [
                ['海報圖片', 'Gemini 內建的 Nano Banana 模型', '中文提示詞表現好、商用授權清楚、支援保持人物一致的編輯'],
                ['投影片 / 文件', 'Gemini Canvas（直接輸出 .pptx / .docx）', '在 Gemini 對話內就能產出可下載的 Office 檔案'],
                ['影片腳本', 'Gemini', '與下午 Flow 工作流無縫銜接'],
                ['影片產出', 'Flow（下午介紹）', 'Google 的 AI 影片工具，內建 Nano Banana + Veo']
              ]
            }
          },
          {
            heading: '認識 Nano Banana：會編輯、會記住人物的圖像模型',
            body: 'Nano Banana = Google Gemini 內建的圖像生成 / 編輯模型（正式名稱 Gemini 2.5 Flash Image）。',
            table: {
              head: ['能力', '對行政/行銷的意義'],
              rows: [
                ['生圖（Text-to-Image）', '用文字描述產出新圖片'],
                ['編輯（Image Editing）', '上傳一張圖，修改其中一部分（換背景、加物件）'],
                ['⭐ 一致性編輯', '修改時保持原本人臉、Logo、產品外觀不變'],
                ['多圖融合', '把多張參考圖融合成新圖']
              ]
            },
            note: 'Imagen 是上一代，Nano Banana 是會記住人的。'
          },
          {
            heading: '短影片黃金 3 秒法則 + PASA / HSC 結構',
            list: [
              ['黃金 3 秒', 'IG Reels / TikTok 用戶 3 秒不被抓住就滑走'],
              ['PASA', 'Pain（痛點）→ Amplify（放大）→ Solution（解法）→ Action（行動）'],
              ['HSC', 'Hook（抓眼球）→ Show（展示）→ Call（行動呼籲） — 8-16 秒短片首選']
            ]
          },
          {
            heading: 'AI 影片核心原理：「圖片→影片」（Image-to-Video）',
            body: '為什麼業界多用 Image-to-Video？因為這樣才能確保影片中的主角長相、場景風格保持一致。',
            illustration: 'day2-image-to-video',
            list: [
              ['步驟 1', '用 Nano Banana 產出 2-3 張關鍵幀（人物、場景）'],
              ['步驟 2', '用 Veo 把每張關鍵幀轉成 3-5 秒動畫片段'],
              ['步驟 3', '在 Flow 內串接片段、加字幕配樂']
            ]
          }
        ],
        prompts: [
          {
            id: 'd2-p1',
            title: '海報文案（步驟 1）',
            note: '先寫文案，再生圖',
            text: `角色：你是「暖光咖啡」店長，要為新品「西西里檸檬咖啡」做 IG 海報文案。
任務：請給我 3 組標語選擇，每組含主標 12 字內、副標 25 字內。
風格：清爽、夏日感、有點文青、避免老套（如「夏日限定 消暑必喝」）。`
          },
          {
            id: 'd2-p2',
            title: 'Nano Banana 出海報（步驟 2）',
            note: '在同一個 Gemini 對話內接續，呼叫 Nano Banana',
            text: `請用 Nano Banana 幫我產生一張正方形（1:1）IG 海報用圖：
- 主視覺：一杯加了檸檬片的特調咖啡，玻璃杯，逆光
- 風格：minimalism, summer, pastel color, instagram photography
- 構圖：上方留白給標題用、下方留白給品牌資訊用
- 不要：文字、人物、品牌 Logo
請一次產 4 張不同變體。`
          },
          {
            id: 'd2-p3',
            title: '把文字加進畫面（步驟 3）',
            note: '同對話內接續：',
            text: `請在這張圖的上方留白處加上「盛夏，重新定義一杯咖啡」，下方角落加上「暖光咖啡 Warm Light」，字型柔和有手寫感。`
          },
          {
            id: 'd2-p4',
            title: 'Canvas 直接生 8 頁投影片',
            note: '在 Gemini 中切到 Canvas 模式',
            text: `角色：你是「綠野選物」總部教育訓練講師。
任務：請依下列大綱直接產生 8 頁投影片並輸出為可下載的 .pptx。
大綱：
1. 標題頁：春季新品香氛蠟燭 門市訓練
2. 為什麼這個新品很重要（1 句口號 + 3 個賣點）
3. 商品三大特色（圖文並列）
4. 客群 TA 與情境
5. 推薦話術 3 句
6. FAQ：常見客戶提問
7. 上架時程與門市分工
8. 結尾：核心價值 GREEN
格式：每頁標題 + 條列 3-5 點，整體風格簡潔、不堆裝飾。
限制：所有條列控制在 25 字內，講者備註 50 字內。`
          },
          {
            id: 'd2-p5',
            title: '短影片腳本（HSC 結構）',
            note: '8-16 秒短片黃金長度',
            text: `角色：你是品牌短影片企劃。
任務：請為「暖光咖啡 西西里檸檬咖啡」寫一支 12 秒 IG Reels 腳本。
結構：HSC
- Hook（0-3 秒）：抓眼球的視覺懸念
- Show（3-9 秒）：產品展示 + 一句賣點
- Call（9-12 秒）：CTA 行動呼籲
格式：分鏡表（時間 / 畫面 / 字幕 / 音樂風格）。
限制：字幕中文，每行 ≤ 12 字。`
          }
        ],
        tasks: [
          { id: 'd2-u1-t1', label: '海報實作：產出 1 張可用的 IG 活動海報（Nano Banana）' },
          { id: 'd2-u1-t2', label: '投影片實作：用 Canvas 生成 8 頁 .pptx 並下載' },
          { id: 'd2-u1-t3', label: '比較「一次到位」vs「先去字版再加字」兩種方案差異' }
        ],
        materials: [
          { id: 'd2-m0', name: '品牌調性指南', type: 'TEXT', desc: '⭐ 海報文案 / IG 貼文最看 voice — 直接套核心人格句到提示詞 R 段' },
          { id: 'd2-m1', name: '綠野選物_新品上架公告作業辦法', type: 'PDF 文件', desc: 'IG 貼文 150 字 + 5 hashtag 等品牌規範' },
          { id: 'd2-m2', name: '綠野選物_新進員工教育訓練手冊', type: 'PDF 文件', desc: '門市同仁訓練流程 + 核心價值 GREEN' }
        ]
      },
      {
        id: 'u2',
        title: '單元 2｜Flow 影片實作',
        time: '13:00 ~ 16:30',
        goals: [
          '理解「圖片→影片」與「角色一致性」的關係。',
          '完成 Flow 工作流：關鍵幀 → 1-2 個動畫片段 → 字幕配樂。',
          '產出 8-16 秒個人化短片。',
          '能依自我檢核（角色一致 / 3 秒 hook / HSC 結構）持續修正素材。'
        ],
        concepts: [
          {
            heading: 'Flow 介面導覽（labs.google/flow 進入頁）',
            illustration: 'day2-flow-ui',
            body: 'Flow 是 Google Labs 的 AI 影片創作工具，整合 Nano Banana 生圖 + Veo 生影片。進入 labs.google/flow 看到 hero 區（其他用戶作品的 tile mosaic 背景 + Flow logo + Create with Flow CTA），按下 CTA 進入登入流程，登入後進 storyboard editor。',
            list: [
              ['Hero 區', '用戶作品的 tile mosaic — 短影片、AI 動畫、storytelling 範例，直觀感受 Flow 能做什麼'],
              ['Create with Flow', '主入口按鈕 — 按下後進入登入；**免費帳號每日 150 點額度**即可開始用'],
              ['Scroll to Explore', '繼續往下捲：功能介紹、定價、Showcase 案例'],
              ['Storyboard editor（登入後）', '時間軸介面：分段 → 關鍵幀 → 提示詞 → 生成 — 詳見下面「Flow 工作流四步驟」']
            ],
            note: '💡 **Flow 免費可用**：登入 Google 帳號後**每日 150 點額度**，夠完整跑完課程實作（一段 8 秒影片約耗 20-40 點，可生 4-6 段測試）。⚠️ 但 Google 沒承諾免費額度永久存在 — 不知何時會取消，重度使用或商用建議訂閱 Google AI Pro / Ultra。'
          },
          {
            heading: 'Flow 兩種圖生影片模式：關鍵幀 vs 素材',
            body: 'Flow 的 Veo 引擎接受兩種圖片輸入方式，**選錯模式會直接決定影片風格與可控度**。動手前先想清楚要哪一種。',
            table: {
              head: ['模式', '輸入', '產出特性', '適用場景'],
              rows: [
                ['**關鍵幀（Frames）**', '2 張圖：起始幀 + 結束幀', 'AI 生成「從起點到終點」的過渡動畫，**動作軌跡可控**', '人物從 A 動作 → B 動作、鏡頭推拉、開門關門等明確「狀態轉變」'],
                ['**素材（Ingredients）**', '1-N 張參考圖（人物 / 物件 / 場景）', 'AI 把參考圖**當素材**重新組合生成新動畫，**畫面自由但可控度低**', '已有人物 / 商品照，要 AI 自由發揮「這人在某情境動作」']
              ]
            },
            list: [
              ['關鍵幀模式 ⭐ 優點', '動作可預期；起終姿勢、構圖完全你決定'],
              ['關鍵幀模式痛點', '需先準備兩張一致的圖（用 Nano Banana 維持人物一致）— 工序多但結果穩'],
              ['素材模式 ⭐ 優點', '只需 1 張人物 / 商品照即可上手；AI 想像力比關鍵幀大、出片快'],
              ['素材模式痛點', '動作軌跡 AI 自己猜，可能違反你預期；需要多次重生挑可用版本']
            ],
            note: '行政學員選法則：**第一次玩用素材模式**（門檻最低、出片快、看到神奇感）；要做**精準的店家開門 / 員工動作示範**等敘事影片，再進階用關鍵幀模式。本日課堂主用素材模式，學員時間夠才嘗試關鍵幀。'
          },
          {
            heading: 'Flow 工作流四步驟（關鍵幀模式）',
            body: '以下流程為**關鍵幀模式**完整四步。素材模式可跳過步驟 1（直接拿 1 張參考圖丟給 Veo），其餘步驟相同。',
            list: [
              ['1. 關鍵幀', '用 Nano Banana 產出 2-3 張一致風格的場景圖'],
              ['2. 動畫片段', '把每張圖丟給 Veo，產出 3-5 秒影片'],
              ['3. 串接', '在 Flow 編輯器內按敘事順序拼接'],
              ['4. 字幕配樂', '加上中文字幕（≤ 12 字 / 行）+ 風格音樂']
            ]
          },
          {
            heading: '常見翻車與救援',
            table: {
              head: ['症狀', '原因', '救援'],
              rows: [
                ['角色長相在不同片段漂移', '沒用一致性編輯', '固定一張參考圖、用 Image-to-Video'],
                ['畫面晃太快', 'Veo 預設 motion 過強', '提示加 "subtle motion, slow pan"'],
                ['字幕擋畫面', '字級太大或位置不對', '安全區留下 1/4，字幕固定下方'],
                ['配樂不配氣氛', 'Flow 預設 stock', '從 Flow 音樂庫挑「acoustic / chill / cinematic」分類']
              ]
            }
          }
        ],
        prompts: [],
        tasks: [
          { id: 'd2-u2-t1', label: '產出 2-3 張一致風格的關鍵幀（用自家品牌主視覺照）' },
          { id: 'd2-u2-t2', label: '把每張關鍵幀轉成 3-5 秒動畫片段' },
          { id: 'd2-u2-t3', label: '在 Flow 串接片段、加字幕配樂，產出 8-16 秒成品' }
        ],
        materials: []
      }
    ],
    homework: [
      '回家用同一張產品照產出 5 種不同版本的海報（換背景、換時段、換情境）。',
      '把今天的 8-16 秒短片發到自家品牌帳號（IG Reels / FB），紀錄第一週互動數。',
      '預習 Day 3：把自己工作上「格式很亂的 Excel」帶 1 份來。'
    ],
    expected: [
      '產出一張 IG 海報、一份 8 頁投影片、一支 8-16 秒短片。',
      '理解並能說明「圖片→影片」與「角色一致性」的關係。',
      '體驗完整的 Flow 工作流。',
      '能依自我檢核重點（角色一致 / 3 秒 hook / HSC 結構）持續修正素材。'
    ]
  },

  // ========== Day 3 ==========
  day3: {
    id: 'day3',
    title: 'Day 3｜行政文件與財務資料整理',
    date: '5/27（六） 09:00 ~ 16:30',
    hours: '6.5 小時',
    learningGoal: '聚焦於行政文件改寫、會議錄音摘要轉會議紀錄，以及發票與表單資料整理至 Excel，協助學員以 AI 大幅縮短常見的行政與財務作業流程。',
    schedule: [
      ['09:00 ~ 09:30', 'Day 2 回顧 + 快速複習', '影片作品快速分享'],
      ['09:30 ~ 12:00', '單元 1 上半：行政文件 AI 改寫', '正式 vs 口語、文件分類、改寫提示詞庫'],
      ['12:00 ~ 13:00', '午休', ''],
      ['13:00 ~ 14:30', '單元 1 下半：NotebookLM 會議錄音摘要', '錄音 → 逐字稿 → 會議紀錄'],
      ['14:30 ~ 15:30', '單元 2 上半：表單清理 + FAQ 產生', '請購單整理、FAQ 初稿'],
      ['15:30 ~ 16:30', '單元 2 下半：發票辨識 + Skill 預演', 'NotebookLM 發票轉 Excel、Skill 一鍵實機展示']
    ],
    units: [
      {
        id: 'u1',
        title: '單元 1｜基於規章的行政文件 AI 生成 + 會議錄音摘要',
        time: '09:30 ~ 14:30',
        goals: [
          '理解 NotebookLM 在行政文件上的優勢：「有本有據」的 Grounded Generation。',
          '學習將公司內部規章作為知識庫，產出完全符合規定的正式公告。',
          '掌握 AI 處理敏感客訴回覆時的「法規與邊界控制」。',
          '能上傳錄音 → 取得逐字稿 → 整理成會議紀錄。',
          '會用 NotebookLM 的「來源引用」功能，避免 AI 亂講。'
        ],
        concepts: [
          {
            heading: '為什麼 Day 1 學的 Gemini 不夠用？',
            list: [
              ['Day 1 Gemini', '適合處理「憑空發想」或「口語改寫」'],
              ['痛點', '若要它寫「公司請假規定」，它會幻想出不屬於你們公司的法規'],
              ['解法', '導入 NotebookLM — 只讀你給的書，不瞎掰']
            ]
          },
          {
            heading: 'NotebookLM 介面導覽（notebooklm.google.com 進入頁）',
            illustration: 'day3-notebooklm-ui',
            body: 'NotebookLM 是 Google 的「以你提供的資料為唯一來源」AI 筆記本。未登入看到 marketing 頁（瞭解任何事物 + 上傳來源 + 即時分析）；登入後切換到實際介面 — 三欄結構：Sources（左）/ Chat（中）/ Studio（右）。',
            list: [
              ['進入頁（未登入）', '看到「瞭解任何事物」hero + 試用按鈕；下方介紹 Sources 上傳與即時分析功能'],
              ['Sources（左欄）', '上傳 PDF / 網頁 / YouTube 影片 / Google 文件 — NotebookLM 的回答只會依你上傳的內容，**不會腦補**'],
              ['Chat（中欄）', '對 Sources 提問 — 每個回答都附引用時間戳（Citation），點擊跳到原文段落'],
              ['Studio（右欄）', '生成 Audio Overview / 心智圖 / 學習指南 / 簡報 — 把 Sources 自動轉成多種輸出格式'],
              ['「我的筆記本」（登入後首頁）', 'grid 排列；每個筆記本是獨立 sources + chat 沙盒，**不互相污染**']
            ],
            note: '行政學員核心場景：上傳公司規章 PDF → 問「員工差勤辦法第幾條規定加班費上限？」NotebookLM 會引用條文回答，比直接 ChatGPT 更穩、不腦補規章內容。Day 3 整天會大量用這套。'
          },
          {
            heading: '基於內部規章生成的「三步驟」',
            list: [
              ['1. 餵資料', '將厚重的 PDF（員工手冊、SOP、退換貨政策）丟入 NotebookLM'],
              ['2. 下指令', '明確告知目的（寫公告 / 寫回覆信），要求嚴格遵守上傳的檔案規定'],
              ['3. 查引用', '檢視 AI 生成結果後面的小數字（引用來源），確保它有抓對法條']
            ]
          },
          {
            heading: '會議紀錄的時間經濟學',
            table: {
              head: ['步驟', '動作', '時間'],
              rows: [
                ['1', '上傳錄音', '30 秒（拖拉即可）'],
                ['2', '自動轉逐字稿', '5-10 分鐘（NotebookLM 後台跑）'],
                ['3', '用提示詞要求整理成會議紀錄', '5 分鐘']
              ]
            },
            note: '整體時間：2 小時 → 15 分鐘。'
          },
          {
            heading: 'NotebookLM 殺手鐧：來源引用（Citation）',
            body: '它每給你一個答案，都會標明「這段是錄音裡第幾分幾秒講的」。意思是：你能驗證它沒亂講。這是它優於 ChatGPT、Gemini 的關鍵。'
          },
          {
            heading: 'Gemini × NotebookLM 連動：兩端共用同一個 notebook（2026/4 新功能）',
            body: '2026 年 4 月 Google 推出「Notebooks in Gemini」— Gemini App 側欄多了 Notebooks 區，與 NotebookLM **雙向同步**：source、custom instruction、命名三項在哪一端改，另一端自動更新。讓你按任務切換工具但**共用同一個知識庫**。',
            list: [
              ['啟用方式', '兩條路：(1) Gemini App 側欄點「**新增 notebook**」開新；(2) 在 NotebookLM 建的 notebook **自動出現**在 Gemini 側欄'],
              ['Gemini 端優勢', '對話可**混合 sources + 網路搜尋**回答 — 適合需要拿規章對照外部法規 / 業界做法的情境'],
              ['NotebookLM 端優勢', '⭐ **Studio 功能**（Audio Overview / Video Overview / Mind Map / 簡報）只在這邊用，Gemini 端目前不支援'],
              ['行政場景範例', '上傳規章到 notebook → Gemini 端寫公告（混 web 知識補背景）→ 切 NotebookLM 用 Studio 生 Audio Overview 給同事邊走邊聽']
            ],
            note: '⚠️ **限制與適用**：(1) 含 Gemini 對話的 notebook 無法 share；(2) NotebookLM 已 share 的 notebook 不會出現在 Gemini；(3) 不適用 18 歲以下、Workspace、Education 帳號；(4) 目前限 **Google AI Ultra / Pro / Plus 訂閱（網頁版）**，**免費版陸續開放中**。若帳號尚未開通，本卡僅當「了解未來功能」介紹，主流程仍以 NotebookLM 單獨使用為主。'
          }
        ],
        prompts: [
          {
            id: 'd3-p1',
            title: '示範 A｜內部正式公告（依差勤辦法）',
            note: '在 NotebookLM 中先上傳差勤辦法 PDF',
            text: `角色：你是總部人資與行政主管。
任務：根據上傳的「差勤管理辦法」，幫我寫一篇「端午節連假出勤與加班費計算」的內部公告 Email。
格式：
1. 主旨明確
2. 重點條列說明（連假期間哪幾天算國定假日、哪幾天算例假日，加班費倍率各是多少）
3. 語氣正式、清晰，避免同仁誤解。
限制：所有薪資與休假規定，必須嚴格依照檔案內的條文，不得自行編造。`
          },
          {
            id: 'd3-p2',
            title: '示範 B｜對外客訴回覆（依退換貨 SOP）',
            note: '在 NotebookLM 中先上傳暖光咖啡退換貨政策',
            text: `角色：你是「暖光咖啡」客服經理。
任務：根據上傳的「退換貨政策」，回覆這位顧客的要求。
顧客評論：「買了你們的濾掛咖啡，拆開喝了一包覺得太酸，我要全部退費！」
語氣：委婉、同理心，但堅定拒絕違反規定的要求。
限制：
- 先對產品口味不符致歉。
- 引用政策中「食品拆封不退」的規定，說明無法全額退費的原因。
- 給出折衷補償（例如：未拆封的可以退，或給予下次消費折扣碼）。`
          },
          {
            id: 'd3-p3',
            title: '會議紀錄整理',
            note: 'NotebookLM 上傳錄音後使用',
            text: `請根據這份會議錄音，整理為正式會議紀錄。
格式：
1. 會議主旨（一句話）
2. 出席人員（從錄音中辨識的講話者）
3. 議題摘要（3-5 條，每條附引用時間）
4. 決議事項（含負責人、期限）
5. 待辦事項清單
限制：原文沒講的不要自己補；不確定的標明「需確認」。`
          }
        ],
        tasks: [
          { id: 'd3-u1-t1', label: '實作 1：上傳一份規章到 NotebookLM，要求產出符合規定的公告或回覆信' },
          { id: 'd3-u1-t2', label: '實作 2：上傳會議錄音逐字稿（用素材中的範本），整理成會議紀錄' },
          { id: 'd3-u1-t3', label: '驗證 NotebookLM 的引用：點開引用標記，確認真的對應來源段落' }
        ],
        materials: [
          { id: 'd3-m1', name: '綠野選物_員工差勤與休假管理辦法', type: 'PDF 文件', desc: '示範 A 的核心知識來源（重點：第十一條國定假日加班費）' },
          { id: 'd3-m2', name: '暖光咖啡_商品退換貨政策', type: 'PDF 文件', desc: '示範 B 核心（重點：第六條拆封不退、第十條補償方案）' },
          { id: 'd3-m3', name: '會議錄音逐字稿範本', type: 'TEXT', desc: '夏季企劃會議 30 分鐘逐字稿，含閒聊與待辦事項' },
          { id: 'd3-m4', name: '綠野選物_新進員工教育訓練手冊', type: 'PDF 文件', desc: '進階備援：7000 字、跨 14 章' }
        ]
      },
      {
        id: 'u2',
        title: '單元 2｜表單清理 + FAQ + 發票轉 Excel + Skill 預演',
        time: '14:30 ~ 16:30',
        goals: [
          '能用 AI 整理「亂格式請購單」並自動歸類會計科目。',
          '能從一堆雜亂客訴中抓出重複問題、產出分類 FAQ。',
          '能將拍照發票辨識並整理成 Excel 表格。',
          '親眼觀摩 Skill 一鍵把發票自動寫入 Excel 的完整流程，理解 Day 4 的學習目標。'
        ],
        concepts: [
          {
            heading: '表單清理的常見痛點',
            list: [
              ['日期格式不統一', '7/1、2025/07/02、7月5日、07-06、7.8 — AI 全部標準化'],
              ['多品項擠在一格', 'A4紙兩包還有碳粉匣一個 — AI 拆分、補單價'],
              ['備註塞重要資訊', '「碳粉匣是1200元」— AI 抓出修正單價'],
              ['會計科目自動歸類', '高鐵票 → 差旅費；便當 → 誤餐費（含合規檢查）']
            ]
          },
          {
            heading: 'FAQ 產生流程',
            list: [
              ['1. 收集原始問題', '從 IG / FB 私訊、Google 評論、客訴信箱倒入'],
              ['2. AI 抓重複', '請 AI 找出語意相同的問題、合併計數'],
              ['3. AI 產 FAQ', '依分類（產品 / 服務 / 政策）寫成標準回答'],
              ['4. 對照官方版', '若有現成 FAQ 比對差異，找出補洞']
            ]
          },
          {
            heading: 'Skill 預演（為 Day 4 暖身）',
            body: '一鍵把發票照片自動寫入 Excel — Day 4 你會親手做一個。',
            illustration: 'day3-invoice-to-excel',
            list: [
              ['輸入', '一張或多張發票照片'],
              ['Skill 內部', '辨識文字 → 分類會計科目 → 合規檢查（誤餐費 ≤ 150）→ 寫入 Excel'],
              ['輸出', '可直接報帳的 Excel 表格']
            ]
          }
        ],
        prompts: [
          {
            id: 'd3-p4',
            title: '請購單清理',
            note: '貼上亂格式請購單原始資料',
            text: `角色：你是會計助理。
任務：把以下亂格式請購單整理成標準表格。
欄位：申請日期（YYYY-MM-DD）、申請人、門市、品項、數量、單價、總計、會計科目、備註。
規則：
1. 日期一律標準化為 YYYY-MM-DD（缺年補 2025）。
2. 多品項拆成多列，並從備註抓出更正單價。
3. 會計科目依以下規則歸類：
   - 高鐵票/計程車 → 差旅費
   - 便當/茶水 → 誤餐費
   - A4紙/碳粉匣/衛生紙 → 辦公用品
   - 冷氣修理 → 修繕費
4. 合規檢查：誤餐費單筆超過 150 元標示 ❌。
[此處貼上請購單原始資料]`
          },
          {
            id: 'd3-p5',
            title: 'FAQ 產生',
            note: '貼上原始客訴 / 提問',
            text: `角色：你是「暖光咖啡」客服主管。
任務：請從以下 10 條客戶原始提問中：
1. 找出語意重複的問題（合併計數）。
2. 依分類（環境設施 / 餐點 / 政策 / 訂位）整理成 FAQ。
3. 每題寫一個 30-50 字的標準回答（語氣親切、明確）。
格式：分類 → 問題 → 答案。
限制：標準答案不可違反公司政策；若需主管裁示，標明「需內部確認」。
[此處貼上原始 10 條提問]`
          },
          {
            id: 'd3-p6',
            title: '發票辨識轉 Excel',
            note: 'NotebookLM 上傳發票照片',
            text: `角色：你是專業且嚴謹的財務稽核專員。
任務：請辨識上傳的發票照片，並整理成報帳 Markdown 表格。
欄位必須為：
| 報帳日期 | 商家名稱 | 發票號碼 | 金額（含稅） | 品項摘要 | 報支科目 | 合規檢查 |
處理規則：
1. 報支科目請根據品項自動分類（如：交通費、誤餐費、辦公用品等）。
2. 合規檢查：核對金額與品項，若餐飲費超過 150 元，標示「❌ 違規超標」；若為高鐵票，標示「✅ 符合」。
3. 無法辨識的文字請填「待人工確認」。`
          }
        ],
        tasks: [
          { id: 'd3-u2-t1', label: '實作 3：用素材中的亂格式請購單，請 AI 整理成標準 Excel' },
          { id: 'd3-u2-t2', label: '實作 4：用 10 條客訴原始素材，產出 FAQ 初稿並對照官方版' },
          { id: 'd3-u2-t3', label: '實作 5：拍照 5 張發票（餐飲 / 交通 / 文具），用 NotebookLM 轉 Excel' },
          { id: 'd3-u2-t4', label: '觀摩：講師示範一鍵 Skill 把發票自動寫入 Excel — Day 4 預熱' }
        ],
        materials: [
          { id: 'd3-m5', name: '亂格式請購單', type: 'CSV', desc: '故意把日期、品項寫得很亂，貼到 Excel A1 自動變表格' },
          { id: 'd3-m6', name: '雜亂客訴 10 則', type: 'TEXT', desc: '丟給 AI 抓重複問題、生成分類 FAQ' },
          { id: 'd3-m7', name: '暖光咖啡_FAQ官方版', type: 'PDF 文件', desc: '評分對照用：學員產出後可拿此對照' },
          { id: 'd3-m8', name: '公司費用報支管理辦法', type: 'PDF 文件', desc: '第四條誤餐費 150 元上限 — 合規檢查依據' },
          { id: 'd3-m9', name: '暖光咖啡_客訴處理SOP', type: 'PDF 文件', desc: '客服 FAQ 撰寫之政策依據' },
          { id: 'd3-m10', name: '暖光咖啡_食材進貨與庫存管理辦法', type: 'PDF 文件', desc: '進貨表分類示範' }
        ]
      }
    ],
    homework: [
      '把今天累積的 5-8 條提示詞，加進 Day 1 的個人提示詞庫，準備 Day 4 封裝成 Skill。',
      '從 Day 3 課後作業挑「最想自動化的那一件事」，明天 Day 4 我們把它做成 Skill。',
      '帶 Day 1~3 累積的提示詞庫（至少 8-10 條）到 Day 4。'
    ],
    expected: [
      '能將會議錄音透過 NotebookLM 產出可用的會議紀錄。',
      '能將拍照發票辨識並整理成 Excel 表格。',
      '能產出 FAQ 初稿。',
      '親眼觀摩 Skill 操作 Excel 的完整流程，理解明天 Day 4 的學習目標。'
    ]
  },

  // ========== Day 4 ==========
  day4: {
    id: 'day4',
    title: 'Day 4｜AI 代理協作、成果展示與小測驗',
    date: '6/3（六） 09:00 ~ 16:30',
    hours: '6.5 小時',
    learningGoal: '上午完成 Antigravity 桌面端安裝並理解 Agent Skills 基本能力，以範本親自建立專屬 Skill；下午認識插件 (Plugin) 與 Skills 的包含關係、完成 Codex App 安裝與 Plugin 試裝，並透過 skills.sh 拓展課後資源，最後完成課後小測驗。',
    schedule: [
      ['09:00 ~ 09:30', '開場 + 環境檢查', '確認筆電狀態、安裝權限'],
      ['09:30 ~ 12:00', '單元 1 上半：工具安裝 + Skill 概念', 'Antigravity 安裝、Skill 三要素（Codex App 下午介紹）'],
      ['12:00 ~ 13:00', '午休', ''],
      ['13:00 ~ 14:30', '單元 1 下半：安裝 Skill + 範本拆解 + 自製初稿', '社群 / 自製兩種來源安裝、範本拆解、AI 協助填初稿'],
      ['14:30 ~ 15:30', '單元 2 上半：學員建立專屬 Skill', '一對一巡堂、個人化微調'],
      ['15:30 ~ 16:00', 'Skills 進階探索', '插件 vs Skills、Codex Plugin、Codex App 安裝、skills.sh'],
      ['16:00 ~ 16:30', '結訓', '合照']
    ],
    units: [
      {
        id: 'u1',
        title: '單元 1｜工具安裝 + Agent Skills 概念',
        time: '09:30 ~ 14:30',
        goals: [
          '完成 Antigravity 桌面端安裝、能開啟新專案。',
          '用一句話說出 Agent Skill 的「輸入、輸出、觸發條件」。',
          '能拆解一個現成 Skill 並改寫成自己的版本。'
        ],
        concepts: [
          {
            heading: 'Antigravity 桌面端安裝（前置）',
            illustration: 'day4-antigravity-install',
            body: '裝 skill 之前先把 Antigravity 本身裝起來。Antigravity 是 Google Labs 推出的 agent-first 桌面 IDE，採個人 Gmail 帳號登入；下載頁三欄並列 macOS / Windows / Linux，挑你的作業系統按下載鍵即可。',
            list: [
              ['下載頁', 'antigravity.google/download — macOS / Windows / Linux 三欄並列，依你的作業系統選'],
              ['macOS', 'Apple Silicon 或 Intel 二擇一，.dmg 拖入 Applications 即完成安裝'],
              ['Windows', 'x64 或 ARM64 二擇一（系統需求 Windows 10 64 bit 以上），下載 .exe 雙擊安裝'],
              ['Linux', '單一安裝檔（需 glibc ≥ 2.28、glibcxx ≥ 3.4.25）'],
              ['登入', '個人 Gmail 帳號（公司 Workspace 帳號目前不支援）']
            ],
            note: '⚠️ 僅從官方 antigravity.google/download 下載；不要從第三方鏡像或要求登入才下載的網站取得安裝檔。Windows SmartScreen 或 macOS Gatekeeper 警告屬正常，按「仍要執行」即可。'
          },
          {
            heading: 'Antigravity 介面導覽（裝好登入後看到什麼）',
            illustration: 'day4-antigravity-ui',
            body: 'Antigravity 是 VS Code 為基底的「agent-first」桌面 IDE — 官方文件（antigravity.google/product）把產品分成七個區塊，行政學員只需先掌握 Agent Manager + Browser Use + Artifacts 三塊即可上手。',
            list: [
              ['Agent Manager', '主視窗（mission control）— 並行管理多個代理，跨多個工作區同時派任務'],
              ['Editor', 'AI 強化的 IDE — 含 Tab 自動完成、命令列、代理協作；行政學員主要用來看代理改了什麼檔'],
              ['Agent', '能自主跨「編輯器 / 終端機 / 瀏覽器」三個介面執行任務的代理本身'],
              ['Artifacts', '代理的交付物 — 用結構化方式呈現代理的進度與結果，不只是聊天記錄'],
              ['User Feedback', '在任何 Artifact 上留評論 — 引導代理朝你要的方向修正，不必整段重講'],
              ['Knowledge', '從歷史對話自動建立的可重用知識庫 — 同一件事不必每次重新教代理'],
              ['Browser Use', '代理可以開 Chrome 自動操作網頁（點擊、捲動、打字、讀 console、截圖）— 行政自動化的核心']
            ],
            note: '對行政學員的優先級：Agent Manager（看代理工作）+ Browser Use（跑網頁自動化）+ Artifacts（驗收結果）是 80% 使用場景；Editor、Knowledge、User Feedback 進階再學。'
          },
          {
            heading: 'Skill 資料夾結構（一個 Skill = 一個資料夾）',
            illustration: 'day4-skill-folder-structure',
            body: '依 agentskills.io 規範：一個 Skill 就是一個資料夾，根層必含 SKILL.md 一份，再視需要加上三類選填子目錄。',
            list: [
              ['SKILL.md', '✅ 必要 — Skill 的入口檔，必須放在資料夾根層（內部寫法見下一張卡）'],
              ['references/', '⚠️ 選填 — 補充知識，**建議放 .md 純文字檔**（如把公司規章另存為 .md），AI 按需載入'],
              ['scripts/', '⚠️ 選填 — 可執行腳本（依 agent 實作支援的語言）'],
              ['assets/', '⚠️ 選填 — 模板、圖片、靜態資源']
            ],
            note: '範例：invoice-to-excel/ 資料夾內含 SKILL.md，公司差勤辦法另存為 .md 後放在 references/expense-policy.md。💡 **為什麼推薦 .md 而非 PDF**：AI 按需載入 references 時，PDF 要先解析（OCR / text-extract）每次都多花 token；純文字 .md 可直接 tokenize，省成本也讓 AI 抓得更準。'
          },
          {
            heading: 'SKILL.md 內部結構（agentskills.io 官方規範）',
            illustration: 'day4-skill-encapsulation',
            body: 'SKILL.md 由兩段組成：上方 YAML frontmatter 寫 metadata（name、description），下方 Markdown body 寫真正的執行指令。',
            list: [
              ['name（必填）', '1-64 字，lowercase + hyphen，不可底線/大寫/連續 hyphen — 且必須與資料夾同名，否則 agent 載不到此 skill'],
              ['description（必填）', '1-1024 字，同時說明「做什麼」+「什麼時候用」— AI 靠這段判斷觸發'],
              ['Markdown body', '指令本體：步驟、輸出格式、處理規則、邊界情況。建議 < 5000 tokens']
            ],
            note: '其餘 frontmatter 欄位（license / compatibility / metadata / allowed-tools）皆選填，多數 Skill 不需要。觸發機制是 progressive disclosure：啟動時只讀 name+description，符合才載入完整 body。'
          },
          {
            heading: 'Skill 放在哪：Antigravity 的掃描目錄（依官網）',
            illustration: 'day4-skill-install-location',
            body: '把 SKILL.md 整個資料夾放到 Antigravity 自動掃描的目錄即可被偵測 — 兩個位置可選：全域（跨專案共用）與工作區（僅當前專案，優先於全域）。',
            table: {
              head: ['範圍', 'macOS / Linux', 'Windows'],
              rows: [
                ['全域（推薦）', '~/.gemini/antigravity/skills/<name>/', '%USERPROFILE%\\.gemini\\antigravity\\skills\\<name>\\'],
                ['工作區（覆蓋全域）', '<project>/.agent/skills/<name>/', '<project>\\.agent\\skills\\<name>\\']
              ]
            },
            list: [
              ['優先順序', '同名 skill 工作區會覆蓋全域'],
              ['驗證安裝', '重啟 Antigravity 對話串 → progressive disclosure 自動偵測'],
              ['跨工具差異', 'Gemini CLI 用 ~/.gemini/skills/（不含 antigravity 子目錄），Codex 用 Plugins UI、Claude Code 用 .claude/skills/'],
              ['跨工具共用', '用 symbolic link：ln -s ~/.gemini/skills ~/.gemini/antigravity/skills（Windows 用 mklink /D）']
            ],
            note: '同一份 SKILL.md 可跨工具使用，差別只在「放置路徑不同」。第一次安裝後務必重啟對話串。'
          },
          {
            heading: 'skill-creator：官方 meta-skill（用 skill 寫 skill）',
            body: 'Anthropic 推出的官方 Skill — 它本身就是 Skill，但專門用來幫你寫其他 Skill。比直接讓 AI 自由發揮品質更高。',
            list: [
              ['它做什麼', '透過 5-7 個問題引導你想清楚（任務、觸發場景、輸入、輸出），再自動產出符合規範的 SKILL.md'],
              ['還可做什麼', '跑測試案例驗證觸發準確度、跑 description 最佳化迭代（最多 5 輪）'],
              ['安裝指令', 'npx skills add https://github.com/anthropics/skills --skill skill-creator'],
              ['使用方式', '在 Codex / Claude / 其他 agent 中直接說「啟動 skill-creator，幫我寫一個 Skill」']
            ],
            note: '自己寫 Skill 像自己寫程式 — 你會慢慢學會。用 skill-creator 像有資深前輩問對問題，幫你抓 description 寫法、命名規則、邊界情況。'
          },
          {
            heading: 'Gem → Skill 升級',
            table: {
              head: ['維度', 'Gem（Day 1 做的）', 'Skill（Day 4 做的）'],
              rows: [
                ['只會講話', '✅', '❌'],
                ['會動手（操作 Excel、寫檔）', '❌', '✅ 可呼叫工具'],
                ['可讀知識來源', '✅', '✅'],
                ['可放在桌面執行環境', '❌', '✅ Antigravity'],
                ['本課程定位', '入門封裝', '進階自動化']
              ]
            }
          }
        ],
        prompts: [
          {
            id: 'd4-p4',
            title: 'Antigravity Skill 安裝指令（PowerShell / Bash）',
            note: '把 skill 放進 Antigravity 的三種方式：方法 A 給自製 skill、方法 B/C 是裝別人寫好的社群 skill。任選其一，安裝後重啟對話串即可。',
            text: `# 三種安裝方式任選一種；安裝路徑與跨工具差異見上方概念卡「Antigravity Skill 安裝位置」。

# ── 方法 A：手動拷貝（最直觀） ──
mkdir -p ~/.gemini/antigravity/skills
cp -R ./invoice-to-excel ~/.gemini/antigravity/skills/

# ── 方法 B：/learn 命令（從 agentskill.sh 裝社群 skill） ──
# 一次性註冊 /learn 命令：
git clone https://github.com/agentskill-sh/ags.git ~/.gemini/antigravity/skills/learn

# 之後在 Antigravity 對話中：
#   /learn seo                                ← 搜尋
#   /learn @anthropic/seo-content-optimizer   ← 安裝特定 skill
#   /learn trending                           ← 看熱門 skill

# ── 方法 C：npx 批次安裝器（Antigravity 專屬，與下午 skills.sh 的 npx skills add 不同工具） ──
npx antigravity-awesome-skills --antigravity                ← 完整社群庫（1400+ 個）
npx @rmyndharis/antigravity-skills install <skill-name>     ← 單一 skill

# ── 安裝後 ──
# 重啟 Antigravity 對話串測試觸發（沒觸發時的檢查清單見上方概念卡）`
          },
          {
            id: 'd4-p1',
            title: 'Skill 範本：發票自動整理（SKILL.md，agentskills.io 官方格式）',
            note: '此為 SKILL.md 純內容；資料夾結構請見上方插圖（資料夾名須與 name 相同）',
            text: `---
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

請參考公司費用報支管理辦法第二章報支標準（放在 references/expense-policy.md 供 skill 載入）。`
          },
          {
            id: 'd4-p3',
            title: 'skill-creator：用官方 meta-skill 寫 Skill（推薦路徑）',
            note: '安裝後在 Codex/Claude 對它說「幫我寫一個 Skill」，它會問你 5-7 個問題然後產出 SKILL.md',
            text: `# 啟動它（安裝指令見上方概念卡「skill-creator」）：
請啟動 skill-creator，幫我寫一個 Skill。
我想做的事情是：[此處用一兩句話描述你的目標任務]

# skill-creator 會引導你跑完三階段：
# 1. 意圖捕捉：問 5-7 個問題逼你想清楚（做什麼？什麼時候用？輸入是？輸出是？）
# 2. 草稿產出：自動寫出符合官方規範的 SKILL.md
# 3. description 最佳化：跑觸發測試，迭代到 description 能準確被啟動（最多 5 輪）`
          },
          {
            id: 'd4-p2',
            title: 'AI 協助寫 SKILL.md（手動路徑：給 Codex / Claude / Gemini）',
            note: '把 Day 1~3 提示詞庫貼進去，要 AI 幫你打草稿。依 agentskills.io 官方規範產出。',
            text: `我有一段每天會用到的提示詞（如下），請幫我包裝成符合 agentskills.io 官方規範的 SKILL.md。

要求：
1. 產出標準 SKILL.md 格式（YAML frontmatter + Markdown body）
2. frontmatter 只填必要欄位：
   - name：1-64 字，全部小寫 + hyphen，不可底線、不可大寫、不可首尾或連續 hyphen
   - description：1-1024 字，必須同時說明「做什麼」+「什麼時候用」
3. Markdown body 含：角色定位、輸出格式、處理規則、邊界情況
4. 完整 RTFC 規則保留在 body 內，不要丟掉我的限制條件

[此處貼上你的提示詞]`
          }
        ],
        tasks: [
          { id: 'd4-u1-t1', label: '完成 Antigravity 桌面端安裝、能開新專案' },
          { id: 'd4-u1-t5', label: '從 skills.sh 或 /learn 安裝一個社群 Skill 試用（任選一個跟你工作有關的）' },
          { id: 'd4-u1-t3', label: '逐行拆解講師的「發票辨識 Skill」範本，標記三要素' },
          { id: 'd4-u1-t4', label: '挑一條 Day 1~3 提示詞，請 AI 協助填成 Skill 初稿' }
        ],
        materials: [
          { id: 'd4-m1', name: 'Skill 範本檔案', type: 'MD', desc: '發票自動整理 SKILL.md（依 agentskills.io 官方規範）— 學員 fork 用' },
          { id: 'd4-m2', name: '公司費用報支管理辦法', type: 'PDF 文件', desc: '完整辦法（18 條）— 適合人讀、做學員 Skill 的人類驗收' },
          { id: 'd4-m3', name: '公司費用報支管理辦法（Skill 精簡版）', type: 'MD', desc: '抽取硬規則 + 合規速查表的 .md 版 — **推薦放進 skill references/**，省 token、AI 取用更準' }
        ]
      },
      {
        id: 'u2',
        title: '單元 2｜學員建立專屬 Skill + 成果展示',
        time: '14:30 ~ 16:30',
        goals: [
          '完成個人化的 Agent Skill 草稿（基於 Day 1~3 提示詞庫）。',
          '能用一句話說明插件 (Plugin) 與 Agent Skills 的包含關係。',
          '完成 Codex App 安裝，並在 Codex 內裝 1 個 Plugin（或從 skills.sh 挑 1 個 Skill）。',
          '通過課後小測驗，達結訓標準。'
        ],
        concepts: [
          {
            heading: '個人化微調的 5 個方向',
            list: [
              ['1. 換角色', '把示範 Skill 的「財務稽核員」改成「行政助理」/「客服主管」'],
              ['2. 換知識來源', '綁定你公司的真實規章（取代範例的差勤辦法）'],
              ['3. 換合規規則', '把 150 元改成你公司實際的上限'],
              ['4. 換輸出格式', 'Excel / Email / Slack 訊息 — 看你下游系統'],
              ['5. 鎖定觸發詞', '寫 3-5 個你會說的觸發語，AI 才會準確自動啟動']
            ]
          },
          {
            heading: '插件 (Plugin) vs Skills：誰包含誰',
            body: 'Plugin 是容器，Skills 是元件。Plugin 通常打包多個 Skills，再加上 Apps（外部服務連結）和 MCP Servers。',
            table: {
              head: ['維度', '插件（Plugin）', 'Agent Skills'],
              rows: [
                ['角色', '容器（打包多個功能模組）', '單一元件（指令模板）'],
                ['包含內容', 'Skills + Apps + MCP Servers', 'YAML/Markdown 定義（input / output / description）'],
                ['例子', 'GitHub Workflow、Slack 自動化插件', 'PR 審閱、發票整理、會議紀錄'],
                ['修改門檻', '通常需懂程式', 'YAML 檔可直接編輯'],
                ['使用方式', '裝來用', '裝來用 or 自己寫（今天上午做的事）']
              ]
            },
            note: 'Plugin 是禮盒，Skill 是禮盒裡的物件。下一段以 Codex 為例看實際運作。'
          },
          {
            heading: 'Codex 三件事：Plugin / Skills / Apps',
            body: 'Codex 是 OpenAI 推出的 coding agent，有三種介面：Codex App（桌面）、Codex CLI（Day 1 已裝）、IDE Extension。Codex 的 Plugin 內含三類元件。',
            table: {
              head: ['名稱', '是什麼', 'Codex 內例子'],
              rows: [
                ['Plugin', '容器，打包多個元件', 'GitHub Workflow 插件'],
                ['Skills', 'Plugin 內的指令模板', 'PR 自動審閱、Issue 摘要'],
                ['Apps', '外部服務連結（ChatGPT 帳號驗證）', 'GitHub、Slack、Google Drive']
              ]
            },
            note: '安裝方式：Codex App 內 Plugins 頁面 → 「+」或 Add to Codex；CLI 內輸入 codex /plugins → Install plugin。'
          },
          {
            heading: 'Codex App 安裝（桌面版）',
            body: 'Codex App 是 Codex 的桌面 GUI 工具，跟 Day 1 裝的 CLI 不同介面。提供多執行緒並行、Git Worktree 整合、視覺化介面。',
            list: [
              ['下載', 'developers.openai.com/codex/app'],
              ['平台', 'macOS（Apple Silicon / Intel）、Windows；Linux 規劃中'],
              ['登入', 'ChatGPT 帳號 或 OpenAI API Key'],
              ['方案', 'ChatGPT Plus / Pro / Business / Edu / Enterprise（免費版暫不支援）'],
              ['特色', '多執行緒並行、Git Worktree 整合、視覺化介面']
            ],
            note: '為什麼裝？多執行緒讓你不用排隊等任務跑完；GUI 對行政人員比 CLI 友善。'
          },
          {
            heading: 'skills.sh：跨工具 Skills 寶庫',
            body: 'Vercel 維護的 Agent Skills 開源生態系——支援 Codex、Claude Code、Cursor、GitHub Copilot、Windsurf 等 18+ 種 AI 代理。',
            list: [
              ['網站', 'skills.sh — 主題、排行榜、代理篩選三種瀏覽方式'],
              ['安裝指令', 'npx skills add <owner/repo>（範例：npx skills add anthropics/skill-pdf）'],
              ['投稿', 'GitHub 開源，開發者可發 PR 投稿'],
              ['安全提醒', '第三方 Skill 可能讀取資料，安裝前看 description 與原始碼']
            ],
            note: '課後第一週先逛 5 個跟你工作有關的 Skill，挑 1 個裝起來實測；長期把 skills.sh 加入書籤，每月看一次。'
          }
        ],
        prompts: [],
        tasks: [
          { id: 'd4-u2-t1', label: '完成個人化 Agent Skill 草稿（含三要素、AI 協助填好）' },
          { id: 'd4-u2-t2', label: '在 Antigravity 內測試 Skill 至少跑通一次' },
          { id: 'd4-u2-t3', label: '完成 Codex App 安裝，並在 Codex 內裝 1 個 Plugin（或從 skills.sh 挑 1 個 Skill）' },
          { id: 'd4-u2-t4', label: '完成課後小測驗（8 題）— 達結訓標準' },
          { id: 'd4-u2-t5', label: '繳交結訓回饋表' }
        ],
        materials: []
      }
    ],
    homework: [
      '回公司在真實工作上跑 5 次你的 Skill，紀錄哪次最有幫助、哪次翻車。',
      '把 4 天的提示詞庫整理成個人 Notion / Google Keep 永久收藏。',
      '加入 AI 行政社群，持續追蹤工具更新。'
    ],
    expected: [
      '完成個人化的 Agent Skill 草稿。',
      '完成 Codex App 安裝，認識插件與 Skills 包含關係，並能運用 skills.sh 拓展資源。',
      '完成 Day 1~3 提示詞 → Day 4 個人化 Skill 的堆疊產出。'
    ]
  },

  // ========== 教學素材總覽 ==========
  materials: [
    { id: 'm-0', name: '品牌調性指南', type: 'TEXT', size: '兩個品牌完整 voice & tone', usedIn: ['全部 4 天'], desc: '⭐ 核心人格 / 語氣關鍵字 / 用字偏好 / 雷區 / 好 vs 壞範例對比，可直接貼到提示詞 R/C 段' },
    { id: 'm-1', name: '綠野選物_員工差勤與休假管理辦法', type: 'PDF 文件', size: '七章二十六條', usedIn: ['Day 1 實作 2', 'Day 3 示範 A'], desc: '3000 字規章，行政人員每年都嫌長的代表性文件' },
    { id: 'm-2', name: '綠野選物_新進員工教育訓練手冊', type: 'PDF 文件', size: '7000 字、跨 14 章', usedIn: ['Day 1 進階備援', 'Day 2 投影片', 'Day 3 進階備援'], desc: '門市同仁訓練流程 + 核心價值 GREEN' },
    { id: 'm-3', name: '綠野選物_新品上架公告作業辦法', type: 'PDF 文件', size: '單章', usedIn: ['Day 2 海報文案規範'], desc: 'IG 貼文 150 字 + 5 hashtag 等品牌規範' },
    { id: 'm-4', name: '暖光咖啡_FAQ 官方版', type: 'PDF 文件', size: '完整 FAQ', usedIn: ['Day 3 實作 3 評分對照'], desc: '⭐ 標準解答' },
    { id: 'm-5', name: '暖光咖啡_商品退換貨政策', type: 'PDF 文件', size: '十條', usedIn: ['Day 3 示範 B'], desc: '第六條拆封不退、第十條補償方案是核心' },
    { id: 'm-6', name: '暖光咖啡_客訴處理SOP', type: 'PDF 文件', size: '完整 SOP', usedIn: ['Day 3 FAQ 示範'], desc: '客服 FAQ 撰寫之政策依據' },
    { id: 'm-7', name: '暖光咖啡_食材進貨與庫存管理辦法', type: 'PDF 文件', size: '單章', usedIn: ['Day 3 進貨表示範'], desc: '提供品項分類規則供 AI 自動歸類' },
    { id: 'm-8', name: '公司費用報支管理辦法', type: 'PDF 文件', size: '完整辦法', usedIn: ['Day 3 表單清理 + 發票合規', 'Day 4 Skill 範本'], desc: '第四條誤餐費 150 元上限 — 合規檢查依據' },
    { id: 'm-8b', name: '公司費用報支管理辦法（Skill 精簡版）', type: 'MD', size: '硬規則 + 合規速查表', usedIn: ['Day 4 Skill references/'], desc: '專為 Skill references/ 設計的精簡 .md — 省 token、AI 取用更準（與 m-8 同源不同用）' },
    { id: 'm-9', name: '課堂實作素材_Day1 / Day2 / Day3', type: 'PDF 文件', size: '三份', usedIn: ['對應日'], desc: '當日實作專用素材' },
    { id: 'm-10', name: '課程輔助文件（口語稿 / 會議逐字稿 / 亂表單 / 客訴 / SKILL.md 範本 / 測驗）', type: 'MD', size: '6 大區塊', usedIn: ['全部 4 天'], desc: '所有實作素材的彙整文件' }
  ],

  // ========== 課後測驗 ==========
  quiz: [
    {
      id: 'q1',
      type: 'single',
      q: '生成式 AI 最核心的運作原理是什麼？',
      options: [
        '透過網路即時搜尋正確答案',
        '透過機率預測下一個最可能出現的文字',
        '透過內建的資料庫進行精確比對'
      ],
      answer: 1
    },
    {
      id: 'q2',
      type: 'single',
      q: '關於 Gemini 與 NotebookLM 的差異，下列何者正確？',
      options: [
        'NotebookLM 可以生圖，Gemini 不行',
        'Gemini 只會根據你上傳的資料回答，NotebookLM 會搜尋網路',
        'NotebookLM 會強制基於你上傳的來源資料生成答案，適合公司規章整理'
      ],
      answer: 2
    },
    {
      id: 'q3',
      type: 'single',
      q: '提示詞四要素（RTFC）指的是哪四個？',
      options: [
        '角色、任務、格式、限制',
        '角色、時間、格式、字數',
        '規則、任務、字體、限制'
      ],
      answer: 0
    },
    {
      id: 'q4',
      type: 'single',
      q: '在使用 NotebookLM 整理錄音檔時，它最大的優勢是什麼？',
      options: [
        '可以自動幫錄音配上背景音樂',
        '產出的摘要會附上引用來源（時間戳），方便回頭驗證',
        '可以自動把錄音翻譯成 50 種語言'
      ],
      answer: 1
    },
    {
      id: 'q5',
      type: 'single',
      q: '製作 AI 短影片時，為何目前業界多採用「圖片轉影片（Image-to-Video）」的做法？',
      options: [
        '因為文字轉影片完全做不出來',
        '因為這樣才能確保影片中的主角長相、場景風格保持一致',
        '因為圖片轉影片的算圖速度比文字慢'
      ],
      answer: 1
    },
    {
      id: 'q6',
      type: 'single',
      q: '想要讓 AI 自動判定請購單上的「買高鐵票」屬於「差旅費」，最好的做法是？',
      options: [
        '拜託 AI 聰明一點',
        '在提示詞中明確給予會計科目的分類規則與定義',
        '買更貴的 AI 模型'
      ],
      answer: 1
    },
    {
      id: 'q7',
      type: 'single',
      q: '關於 Agent Skill 的 description 欄位，下列敘述何者最正確？',
      options: [
        '隨便寫就好，因為只有人類會看',
        '必須寫得非常詳細具體，因為 AI 會根據這段文字決定何時要自動觸發這個 Skill',
        '只能填入英文，不能填寫中文'
      ],
      answer: 1
    },
    {
      id: 'q8',
      type: 'single',
      q: '當學員使用 AI 產出了一份對外的客訴回覆信，下一步應該怎麼做？',
      options: [
        '直接複製貼上送出，因為 AI 不會出錯',
        '務必由人工（Human in the loop）檢查過語氣與承諾是否符合公司政策再送出',
        '交給另一個 AI 檢查後自動送出'
      ],
      answer: 1
    }
  ]
};
