// ─── Usage Candidate Evidence Data ───
// This file defines the 35 product × usage combination statuses
// for the V1 usage candidate system.
//
// Status: DATA FILE — no scoring, ranking, or recommendation logic.
// Frozen: All entries. Do not change status values without authorization.
import type { ModelId } from "./data";

export type UsageCategory =
  | "writing"
  | "document"
  | "research"
  | "presentation"
  | "code"
  | "image"
  | "video";

export type UsageCandidateStatus =
  | "supported_candidate"
  | "pending"
  | "explicitly_not_candidate_for_this_specific_capability";

export type UsageCandidateEvidenceEntry = {
  modelId: ModelId;
  usageCategory: UsageCategory;
  status: UsageCandidateStatus;
  scopeNote: string;
};

export const USAGE_CANDIDATE_EVIDENCE: readonly UsageCandidateEvidenceEntry[] = [
  // ── writing ──
  { modelId: "chatgpt", usageCategory: "writing", status: "supported_candidate", scopeNote: "可用於文字草稿、改寫與協作編修；實際可用功能受帳號、方案與用量限制。" },
  { modelId: "claude", usageCategory: "writing", status: "supported_candidate", scopeNote: "可建立、修改與迭代文字內容；實際可用功能受帳號、方案與用量限制。" },
  { modelId: "gemini", usageCategory: "writing", status: "supported_candidate", scopeNote: "可建立與編輯文件內容；實際可用功能受帳號、方案與用量限制。" },
  { modelId: "deepseek", usageCategory: "writing", status: "supported_candidate", scopeNote: "可用於文字內容建立；不代表各類進階工作流均可用。" },
  { modelId: "grok", usageCategory: "writing", status: "supported_candidate", scopeNote: "可用於長文編修與文字工作；實際可用功能受帳號、方案與用量限制。" },

  // ── document ──
  { modelId: "chatgpt", usageCategory: "document", status: "supported_candidate", scopeNote: "可上傳文件進行摘要、內容回饋、改寫與資訊擷取；免費層可能有較嚴格額度限制。" },
  { modelId: "claude", usageCategory: "document", status: "supported_candidate", scopeNote: "支援多種文件類型上傳與分析；檔案類型、大小與功能權限依帳號設定而異。" },
  { modelId: "gemini", usageCategory: "document", status: "supported_candidate", scopeNote: "可上傳文件、試算表等內容取得摘要與洞見；實際限制依帳號與方案而異。" },
  { modelId: "deepseek", usageCategory: "document", status: "supported_candidate", scopeNote: "可處理檔案閱讀、上傳或文字擷取相關用途；細節依入口與版本而異。" },
  { modelId: "grok", usageCategory: "document", status: "supported_candidate", scopeNote: "可分析檔案與 PDF 並提供摘要；實際可用功能受帳號、方案與用量限制。" },

  // ── research ──
  { modelId: "chatgpt", usageCategory: "research", status: "supported_candidate", scopeNote: "可結合公開網頁、指定網站、檔案與已啟用的 apps 產出附資料來源的研究結果；功能可用性依方案與帳號而異。" },
  { modelId: "claude", usageCategory: "research", status: "supported_candidate", scopeNote: "可搭配 web search 與 citations；功能可用性依帳號、地區與功能權限而異。" },
  { modelId: "gemini", usageCategory: "research", status: "supported_candidate", scopeNote: "可使用 Google Search 與其他來源進行研究；功能可用性依帳號、地區與方案而異。" },
  { modelId: "deepseek", usageCategory: "research", status: "supported_candidate", scopeNote: "可使用 web search 或搜尋增強相關能力；不保證所有入口、帳號或方案皆可使用。" },
  { modelId: "grok", usageCategory: "research", status: "supported_candidate", scopeNote: "可使用即時 web/X 搜尋與引用；實際可用功能受帳號、方案與用量限制。" },

  // ── presentation ──
  { modelId: "chatgpt", usageCategory: "presentation", status: "supported_candidate", scopeNote: "可針對上傳的 PowerPoint 提供內容回饋、摘要、改寫或轉成文件；不可解讀為一般入口必定能完整自動建立投影片。" },
  { modelId: "claude", usageCategory: "presentation", status: "supported_candidate", scopeNote: "可建立與編輯 PowerPoint 等檔案；實際可用性受帳號設定、平台與功能權限限制。" },
  { modelId: "gemini", usageCategory: "presentation", status: "supported_candidate", scopeNote: "可依指示建立或編輯文件內容，例如 slide deck；實際產出與可用性依帳號、地區與功能狀態而異。" },
  { modelId: "deepseek", usageCategory: "presentation", status: "pending", scopeNote: "尚未有足夠資料支持其直接處理投影片建立、編輯或簡報內容工作；不代表不支援。" },
  { modelId: "grok", usageCategory: "presentation", status: "pending", scopeNote: "尚未有足夠資料支持其直接處理投影片建立、編輯或簡報內容工作；不代表不支援。" },

  // ── code ──
  { modelId: "chatgpt", usageCategory: "code", status: "supported_candidate", scopeNote: "可用於寫程式、除錯與協作式程式編修；實際工具與額度依帳號、平台與方案而異。" },
  { modelId: "claude", usageCategory: "code", status: "supported_candidate", scopeNote: "可支援程式工作；不同入口與功能權限可能不同。" },
  { modelId: "gemini", usageCategory: "code", status: "supported_candidate", scopeNote: "可建立、編輯與預覽程式或 app；實際功能依帳號、地區與平台而異。" },
  { modelId: "deepseek", usageCategory: "code", status: "supported_candidate", scopeNote: "可支援 code generation、understanding、debugging 與 completion；不代表各種 agent 工作流都可用。" },
  { modelId: "grok", usageCategory: "code", status: "supported_candidate", scopeNote: "可用於寫程式、除錯與程式說明；實際工具與額度依帳號、方案與平台而異。" },

  // ── image ──
  { modelId: "chatgpt", usageCategory: "image", status: "supported_candidate", scopeNote: "可生成圖片、以自然語言修改圖片，也可分析上傳圖片；免費層可能有較嚴格使用限制。" },
  { modelId: "claude", usageCategory: "image", status: "explicitly_not_candidate_for_this_specific_capability", scopeNote: "不列為照片或插畫式圖片生成候選；這不代表不能做圖表、SVG、diagram 或互動視覺。" },
  { modelId: "gemini", usageCategory: "image", status: "supported_candidate", scopeNote: "可處理圖片建立與編修相關功能；功能可能依帳號、地區、平台與逐步推出狀態而不同。" },
  { modelId: "deepseek", usageCategory: "image", status: "pending", scopeNote: "尚未有足夠消費者端圖片生成或修圖資料；不代表不支援。" },
  { modelId: "grok", usageCategory: "image", status: "supported_candidate", scopeNote: "可生成圖片、編修圖片並理解圖片內容；實際可用性依帳號、方案與地區而異。" },

  // ── video ──
  { modelId: "chatgpt", usageCategory: "video", status: "pending", scopeNote: "影片能力可能屬不同入口或產品線；本輪不納入推薦判定。" },
  { modelId: "claude", usageCategory: "video", status: "pending", scopeNote: "尚未有足夠資料支持直接影片生成、剪輯、理解或摘要；不代表不支援。" },
  { modelId: "gemini", usageCategory: "video", status: "supported_candidate", scopeNote: "可處理影片建立與編輯相關能力；實際可用性可能依帳號、地區、方案與逐步推出狀態而不同。" },
  { modelId: "deepseek", usageCategory: "video", status: "pending", scopeNote: "尚未有足夠資料支持直接影片能力；不代表不支援。" },
  { modelId: "grok", usageCategory: "video", status: "supported_candidate", scopeNote: "可處理文字生成影片、圖片轉影片與影片編輯；實際可用性依帳號、方案、地區與產品入口而異。" },
] as const;
