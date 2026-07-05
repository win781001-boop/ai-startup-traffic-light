import type { ModelId } from "./data";

export type UsageCategory = "writing" | "document" | "research" | "presentation" | "code" | "image" | "video";
export type UsageCandidateStatus = "supported_candidate" | "pending" | "explicitly_not_candidate_for_this_specific_capability";

export type UsageCandidateEvidenceEntry = {
  modelId: ModelId;
  usageCategory: UsageCategory;
  status: UsageCandidateStatus;
  scopeNote: string;
};

export const USAGE_CANDIDATE_EVIDENCE: readonly UsageCandidateEvidenceEntry[] = [
  { modelId: "chatgpt", usageCategory: "writing", status: "supported_candidate", scopeNote: "text" },
  { modelId: "claude", usageCategory: "writing", status: "supported_candidate", scopeNote: "text" },
  { modelId: "gemini", usageCategory: "writing", status: "supported_candidate", scopeNote: "text" },
  { modelId: "deepseek", usageCategory: "writing", status: "supported_candidate", scopeNote: "text" },
  { modelId: "grok", usageCategory: "writing", status: "supported_candidate", scopeNote: "text" },
  { modelId: "chatgpt", usageCategory: "document", status: "supported_candidate", scopeNote: "text" },
  { modelId: "claude", usageCategory: "document", status: "supported_candidate", scopeNote: "text" },
  { modelId: "gemini", usageCategory: "document", status: "supported_candidate", scopeNote: "text" },
  { modelId: "deepseek", usageCategory: "document", status: "supported_candidate", scopeNote: "text" },
  { modelId: "grok", usageCategory: "document", status: "supported_candidate", scopeNote: "text" },
  { modelId: "chatgpt", usageCategory: "research", status: "supported_candidate", scopeNote: "text" },
  { modelId: "claude", usageCategory: "research", status: "supported_candidate", scopeNote: "text" },
  { modelId: "gemini", usageCategory: "research", status: "supported_candidate", scopeNote: "text" },
  { modelId: "deepseek", usageCategory: "research", status: "supported_candidate", scopeNote: "text" },
  { modelId: "grok", usageCategory: "research", status: "supported_candidate", scopeNote: "text" },
  { modelId: "chatgpt", usageCategory: "presentation", status: "supported_candidate", scopeNote: "text" },
  { modelId: "claude", usageCategory: "presentation", status: "supported_candidate", scopeNote: "text" },
  { modelId: "gemini", usageCategory: "presentation", status: "supported_candidate", scopeNote: "text" },
  { modelId: "deepseek", usageCategory: "presentation", status: "pending", scopeNote: "text" },
  { modelId: "grok", usageCategory: "presentation", status: "pending", scopeNote: "text" },
  { modelId: "chatgpt", usageCategory: "code", status: "supported_candidate", scopeNote: "text" },
  { modelId: "claude", usageCategory: "code", status: "supported_candidate", scopeNote: "text" },
  { modelId: "gemini", usageCategory: "code", status: "supported_candidate", scopeNote: "text" },
  { modelId: "deepseek", usageCategory: "code", status: "supported_candidate", scopeNote: "text" },
  { modelId: "grok", usageCategory: "code", status: "supported_candidate", scopeNote: "text" },
  { modelId: "chatgpt", usageCategory: "image", status: "supported_candidate", scopeNote: "text" },
  { modelId: "claude", usageCategory: "image", status: "explicitly_not_candidate_for_this_specific_capability", scopeNote: "text" },
  { modelId: "gemini", usageCategory: "image", status: "supported_candidate", scopeNote: "text" },
  { modelId: "deepseek", usageCategory: "image", status: "pending", scopeNote: "text" },
  { modelId: "grok", usageCategory: "image", status: "supported_candidate", scopeNote: "text" },
  { modelId: "chatgpt", usageCategory: "video", status: "pending", scopeNote: "text" },
  { modelId: "claude", usageCategory: "video", status: "pending", scopeNote: "text" },
  { modelId: "gemini", usageCategory: "video", status: "supported_candidate", scopeNote: "text" },
  { modelId: "deepseek", usageCategory: "video", status: "pending", scopeNote: "text" },
  { modelId: "grok", usageCategory: "video", status: "supported_candidate", scopeNote: "text" },
] as const;
