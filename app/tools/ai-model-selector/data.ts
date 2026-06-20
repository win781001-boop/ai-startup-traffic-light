export type ModelId = "chatgpt" | "claude" | "gemini" | "deepseek" | "grok";

export interface Option {
  id: string;
  text: string;
  scores: Record<ModelId, number>;
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
}

export interface ModelInfo {
  id: ModelId;
  name: string;
  tagline: string;
  whyRecommend: string[];
  useCases: string[];
  altContext: string;
}

// ─── Phase 1: Category-based checkbox selection ───

export interface CheckboxItem {
  id: string;
  text: string;
}

export interface SubGroup {
  id: string;
  title: string;
  items: CheckboxItem[];
}

export interface Category {
  id: string;
  title: string;
  subGroups: SubGroup[];
}

export const categories: Category[] = [
  {
    id: "usage",
    title: "你想用 AI 做哪些事？",
    subGroups: [
      {
        id: "writing",
        title: "寫東西與回訊息",
        items: [
          { id: "writing_article", text: "寫文章、貼文、商品介紹或文案" },
          { id: "writing_email", text: "寫 Email、訊息或工作回覆" },
          { id: "writing_rewrite", text: "改寫、潤稿、調整語氣" },
        ],
      },
      {
        id: "document",
        title: "整理文件與筆記",
        items: [
          { id: "document_summary", text: "摘要長文章、PDF、報告" },
          { id: "document_meeting", text: "整理會議紀錄、筆記與待辦事項" },
          { id: "document_organize", text: "把零散內容整理成條列或表格" },
        ],
      },
      {
        id: "research",
        title: "查資料與找答案",
        items: [
          { id: "research_latest", text: "查最新資訊" },
          { id: "research_compare", text: "比較不同產品、方案或觀點" },
          { id: "research_summarize", text: "整理查到的資料重點" },
        ],
      },
      {
        id: "presentation",
        title: "做簡報、表格與工作整理",
        items: [
          { id: "presentation_excel", text: "整理 Excel 或表格內容" },
          { id: "presentation_analyze", text: "協助分析數字與趨勢" },
          { id: "presentation_outline", text: "做簡報大綱、報告重點與圖表說明" },
        ],
      },
      {
        id: "code",
        title: "寫程式或做小工具",
        items: [
          { id: "code_write", text: "請 AI 幫忙寫程式" },
          { id: "code_debug", text: "修改、除錯或看懂程式碼" },
          { id: "code_website", text: "做簡單網站、網頁或小工具" },
        ],
      },
      {
        id: "image",
        title: "做圖片與視覺素材",
        items: [
          { id: "image_generate", text: "AI 生圖" },
          { id: "image_social", text: "社群貼圖、商品圖或宣傳圖" },
          { id: "image_deck", text: "簡報配圖、海報或視覺素材" },
          { id: "image_edit", text: "修改圖片，例如換背景或去除物件" },
        ],
      },
      {
        id: "video",
        title: "做影片與短影音素材",
        items: [
          { id: "video_script", text: "想短影音腳本" },
          { id: "video_material", text: "產生簡單影片素材或動態圖片" },
          { id: "video_subtitle", text: "整理字幕、逐字稿或影片重點" },
        ],
      },
    ],
  },
];

// ─── Legacy quiz data (preserved for backward compat) ───

export const questions: Question[] = [
  {
    id: "q1",
    text: "你最常想用 AI 做什麼？",
    options: [
      { id: "q1_writing", text: "寫文案、社群貼文、企劃", scores: { chatgpt: 10, claude: 6, gemini: 2, deepseek: 3, grok: 1 } },
      { id: "q1_reading", text: "整理資料、摘要、閱讀長文件", scores: { chatgpt: 5, claude: 10, gemini: 3, deepseek: 2, grok: 0 } },
      { id: "q1_code", text: "寫程式、除錯、做網站", scores: { chatgpt: 4, claude: 5, gemini: 1, deepseek: 10, grok: 0 } },
      { id: "q1_research", text: "查資料、研究問題、追蹤即時資訊", scores: { chatgpt: 3, claude: 2, gemini: 2, deepseek: 1, grok: 10 } },
      { id: "q1_daily", text: "日常工作協助、聊天、想點子", scores: { chatgpt: 10, claude: 3, gemini: 4, deepseek: 2, grok: 2 } },
    ],
  },
  {
    id: "q2",
    text: "你的工作或生活最常使用哪種工具？",
    options: [
      { id: "q2_google", text: "Google 文件、Gmail、Drive", scores: { chatgpt: 3, claude: 2, gemini: 10, deepseek: 1, grok: 1 } },
      { id: "q2_microsoft", text: "Word、Excel、PowerPoint、Microsoft 服務", scores: { chatgpt: 6, claude: 5, gemini: 3, deepseek: 2, grok: 0 } },
      { id: "q2_devtools", text: "VS Code、GitHub、程式開發工具", scores: { chatgpt: 3, claude: 4, gemini: 1, deepseek: 10, grok: 0 } },
      { id: "q2_mobile", text: "手機 App 為主", scores: { chatgpt: 6, claude: 2, gemini: 4, deepseek: 2, grok: 3 } },
      { id: "q2_none", text: "沒有固定工具，想找一個好上手的 AI", scores: { chatgpt: 9, claude: 2, gemini: 4, deepseek: 2, grok: 1 } },
    ],
  },
  {
    id: "q3",
    text: "你最在意什麼？",
    options: [
      { id: "q3_chinese", text: "中文溝通自然、用途廣", scores: { chatgpt: 10, claude: 4, gemini: 3, deepseek: 5, grok: 1 } },
      { id: "q3_quality", text: "長文理解、寫作與整理品質", scores: { chatgpt: 4, claude: 10, gemini: 2, deepseek: 3, grok: 0 } },
      { id: "q3_tech", text: "程式能力與技術協助", scores: { chatgpt: 3, claude: 5, gemini: 1, deepseek: 10, grok: 0 } },
      { id: "q3_realtime", text: "即時資訊、熱門話題與研究", scores: { chatgpt: 3, claude: 1, gemini: 2, deepseek: 1, grok: 10 } },
      { id: "q3_cost", text: "速度快、成本低", scores: { chatgpt: 4, claude: 2, gemini: 3, deepseek: 10, grok: 3 } },
    ],
  },
  {
    id: "q4",
    text: "你的預算偏好？",
    options: [
      { id: "q4_free", text: "先用免費版就好", scores: { chatgpt: 5, claude: 1, gemini: 5, deepseek: 10, grok: 3 } },
      { id: "q4_low", text: "可接受低月費", scores: { chatgpt: 8, claude: 3, gemini: 4, deepseek: 5, grok: 2 } },
      { id: "q4_pay", text: "願意付費，只要能明顯提升效率", scores: { chatgpt: 7, claude: 8, gemini: 5, deepseek: 2, grok: 2 } },
      { id: "q4_lowcost_heavy", text: "希望低成本大量使用", scores: { chatgpt: 3, claude: 2, gemini: 3, deepseek: 10, grok: 2 } },
    ],
  },
  {
    id: "q5",
    text: "你目前使用 AI 的狀況？",
    options: [
      { id: "q5_new", text: "第一次接觸，想先挑一個最好上手的", scores: { chatgpt: 10, claude: 1, gemini: 5, deepseek: 2, grok: 1 } },
      { id: "q5_occasional", text: "偶爾用，主要處理生活或一般工作", scores: { chatgpt: 8, claude: 3, gemini: 4, deepseek: 2, grok: 1 } },
      { id: "q5_daily", text: "幾乎每天使用，需要一個主力工具", scores: { chatgpt: 5, claude: 5, gemini: 3, deepseek: 5, grok: 2 } },
      { id: "q5_experienced", text: "已經會用 AI，想找更符合特定需求的模型", scores: { chatgpt: 3, claude: 5, gemini: 3, deepseek: 4, grok: 3 } },
    ],
  },
];

export const modelInfo: Record<ModelId, ModelInfo> = {
  chatgpt: {
    id: "chatgpt", name: "ChatGPT",
    tagline: "泛用型主力，中文溝通與跨領域表現穩定",
    whyRecommend: [
      "ChatGPT 在中文對話、企劃發想與日常工作的回應品質經過大量使用者驗證，適合做為第一個主力工具。",
      "從文案、摘要到程式除錯都能處理，單一工具即可涵蓋多數日常需求。",
      "免費版功能已相當完整，進階需求可依使用頻率逐步升級，學習曲線平緩。",
    ],
    useCases: [
      "撰寫社群貼文、行銷文案、活動企劃書",
      "日常會議記錄整理、Email 草稿與回覆建議",
      "基礎程式撰寫、SQL 查詢與 Excel 公式協助",
      "靈感發想、Brainstorming 與問題討論",
    ],
    altContext: "若日後長文件處理或程式碼佔比愈來愈高，Claude 或 DeepSeek 可能更貼近進階需求。",
  },
  claude: {
    id: "claude", name: "Claude",
    tagline: "長文理解與寫作品質見長，適合內容深度工作者",
    whyRecommend: [
      "Claude 在長上下文理解與結構化寫作上表現突出，適合大量文字與文件的場景。",
      "回覆結構與邏輯清晰度受到創作者與專業寫作者的肯定，適合需要產出高品質內容的工作。",
      "對中文長文的掌握度與摘要品質具競爭力，可有效縮短閱讀與整理時間。",
    ],
    useCases: [
      "閱讀與摘要長篇研究報告、論文或合約文件",
      "撰寫結構化的文章、報告、教學文件",
      "分析大量對話紀錄、訪談稿或使用者回饋",
      "程式碼 Review、重構建議與技術文件撰寫",
    ],
    altContext: "若工作更偏向短文案、快速反應或多領域切換，ChatGPT 的泛用性可能更適合。",
  },
  gemini: {
    id: "gemini", name: "Gemini",
    tagline: "與 Google 服務深度整合，適合 Google 工作流使用者",
    whyRecommend: [
      "Gemini 與 Google Workspace 的整合是最大優勢，可直接在常用工具中使用 AI。",
      "多模態能力強，可同時理解文字、圖片與檔案內容，適合多格式資訊的使用者。",
      "免費版配額大方，可透過 Google One 合理升級，適合預算有限但需要穩定服務的使用者。",
    ],
    useCases: [
      "在 Google 文件中直接生成與編輯內容",
      "從 Gmail 信件摘要重點、自動分類與回覆建議",
      "分析 Google 試算表資料，快速產生圖表與洞察",
      "透過 Gemini App 進行圖片辨識與文件分析",
    ],
    altContext: "若非 Google 生態系經常使用者，或需要更深入的中文文案處理，ChatGPT 或 Claude 可能更適合。",
  },
  deepseek: {
    id: "deepseek", name: "DeepSeek",
    tagline: "程式能力強、成本低，適合大量使用與技術任務",
    whyRecommend: [
      "DeepSeek 在程式碼生成與技術問題解答上有紮實表現，且提供極具競爭力的低價方案。",
      "中文理解能力良好，對台灣使用者的語言習慣掌握度佳。",
      "Token 成本遠低於同級模型，適合需要頻繁呼叫 API 或大量對話的場景。",
    ],
    useCases: [
      "程式碼生成、除錯、重構與技術問題解答",
      "大量資料批次處理與自動化腳本撰寫",
      "以低預算進行大量 AI 對話測試與實驗",
      "中文技術文件撰寫與程式教學輔助",
    ],
    altContext: "若需求更偏向企劃撰寫或長篇寫作，ChatGPT 或 Claude 在這些領域的生態系更完整。",
  },
  grok: {
    id: "grok", name: "Grok",
    tagline: "即時資訊與社群脈絡敏銳，適合關注熱門話題",
    whyRecommend: [
      "Grok 的即時資訊掌握能力突出，能快速回應當前熱門話題與社群討論脈絡。",
      "回覆風格直接靈活，適合需要快速掌握不同觀點或趨勢判斷的使用者。",
      "對社群平台討論與新聞事件反應速度快，適合內容創作者與社群小編。",
    ],
    useCases: [
      "快速了解最新時事、社群熱門話題與趨勢",
      "研究特定議題的不同觀點與討論脈絡",
      "社群貼文靈感發想與流行話題追蹤",
      "需要靈活、不拘形式的快速問答與討論",
    ],
    altContext: "若工作更多是結構化寫作或技術開發，ChatGPT 或 Claude 表現更穩定完整。",
  },
};

export function calculateResult(
  answers: Record<string, string>
): { first: ModelId; second: ModelId; allScores: Record<ModelId, number> } {
  const scores: Record<ModelId, number> = { chatgpt: 0, claude: 0, gemini: 0, deepseek: 0, grok: 0 };

  for (const question of questions) {
    const answerId = answers[question.id];
    if (!answerId) continue;
    const option = question.options.find((o) => o.id === answerId);
    if (!option) continue;
    for (const [model, score] of Object.entries(option.scores)) {
      scores[model as ModelId] += score;
    }
  }

  const sorted = (Object.entries(scores) as [ModelId, number][]).sort((a, b) => b[1] - a[1]);

  return { first: sorted[0][0], second: sorted[1][0], allScores: scores };
}

export function generateSummary(
  answers: Record<string, string>,
  first: ModelId
): string {
  const modelName = modelInfo[first].name;
  const traits: string[] = [];

  if (answers.q1 === "q1_writing") traits.push("文案與企劃");
  if (answers.q1 === "q1_reading") traits.push("長文處理與資料整理");
  if (answers.q1 === "q1_code") traits.push("程式開發");
  if (answers.q1 === "q1_research") traits.push("即時資訊與研究");
  if (answers.q1 === "q1_daily") traits.push("日常工作協助");
  if (answers.q3 === "q3_chinese") traits.push("中文溝通");
  if (answers.q3 === "q3_quality") traits.push("內容品質");
  if (answers.q3 === "q3_tech") traits.push("技術能力");
  if (answers.q3 === "q3_realtime") traits.push("即時性");
  if (answers.q3 === "q3_cost") traits.push("成本效益");
  if (answers.q5 === "q5_new") traits.push("剛開始接觸 AI");
  if (answers.q5 === "q5_occasional") traits.push("偶爾使用");
  if (answers.q5 === "q5_daily") traits.push("需要主力工具");
  if (answers.q5 === "q5_experienced") traits.push("已有使用經驗");

  const traitStr = traits.length > 0 ? traits.join("、") : "多種面向";
  return `你重視${traitStr}，因此 ${modelName} 較適合作為你目前的主力 AI。`;
}
