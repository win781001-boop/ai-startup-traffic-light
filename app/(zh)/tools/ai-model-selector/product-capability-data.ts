import type {
  FreePlanFeasibilityTable,
  ProductDataMetadata,
  CapabilityEvidence,
} from "./product-capabilities";
import type { ModelId } from "./data";

const OBSERVED_AT = "2026-06-23";

function ev(label: string, url: string, kind: string, confidence: string) {
  return { sourceLabel: label, sourceUrl: url, observedAt: OBSERVED_AT, evidenceKind: kind, confidence };
}

export const freePlanFeasibilityTable = {
  chatgpt: { has_free_plan: true, free_plan_message_limit: "limited", free_plan_quota_tolerance: "tight", free_long_context_available: true, free_search_available: true, free_memory_available: true, free_adult_content_allowed: "restricted" },
  claude: { has_free_plan: true, free_plan_message_limit: "limited", free_plan_quota_tolerance: "tight", free_long_context_available: "pending", free_search_available: true, free_memory_available: true, free_adult_content_allowed: "restricted" },
  gemini: { has_free_plan: true, free_plan_message_limit: "pending", free_plan_quota_tolerance: "pending", free_long_context_available: "pending", free_search_available: "pending", free_memory_available: "pending", free_adult_content_allowed: "pending" },
  deepseek: { has_free_plan: "pending", free_plan_message_limit: "pending", free_plan_quota_tolerance: "pending", free_long_context_available: "pending", free_search_available: "pending", free_memory_available: "pending", free_adult_content_allowed: "pending" },
  grok: { has_free_plan: "pending", free_plan_message_limit: "pending", free_plan_quota_tolerance: "pending", free_long_context_available: "pending", free_search_available: "pending", free_memory_available: "pending", free_adult_content_allowed: "pending" },
};

export const freePlanMetadata = {
  chatgpt: { modelId: "chatgpt" as const, observedAt: OBSERVED_AT, evidence: [
    ev("OpenAI Pricing -- Free plan availability", "https://openai.com/pricing", "official_product_page", "high"),
    ev("OpenAI Usage Policies -- adult content restrictions", "https://openai.com/policies/usage-policies", "policy_page", "medium"),
    ev("GPT-5.5 Instant tools support -- Memory listed", "https://help.openai.com/en/articles/gpt-5-5", "official_documentation", "high"),
  ] },
  claude: { modelId: "claude" as const, observedAt: OBSERVED_AT, evidence: [
    ev("Claude Pricing -- Free plan column", "https://claude.com/pricing", "official_product_page", "high"),
    ev("Claude Pricing -- Memory across conversations in Free column", "https://claude.com/pricing", "official_product_page", "high"),
    ev("Anthropic Usage Policies -- adult content restrictions", "https://www.anthropic.com/legal/usage-policies", "policy_page", "medium"),
  ] },
  gemini: { modelId: "gemini" as const, observedAt: OBSERVED_AT, evidence: [
    ev("Gemini plan page -- /month Google Account option", "https://gemini.google.com/", "official_product_page", "high"),
    ev("Remaining free-plan fields: evidence insufficient", "", "official_documentation", "low"),
  ] },
  deepseek: { modelId: "deepseek" as const, observedAt: OBSERVED_AT, evidence: [
    ev("All free-plan fields: evidence insufficient -- no consumer-facing pricing/plan page accessible", "", "official_documentation", "low"),
  ] },
  grok: { modelId: "grok" as const, observedAt: OBSERVED_AT, evidence: [
    ev("All free-plan fields: evidence insufficient -- x.ai returns 403; no consumer-facing plan page accessible", "", "official_documentation", "low"),
  ] },
};
