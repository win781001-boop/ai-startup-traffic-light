// AI Model Selector -- Product Capabilities Data Contract
import type { ModelId } from "./data";
import type { UsageGroup } from "./rules";

export type FitLevel = "strong_fit" | "workable" | "weak_fit" | "unsuitable";
export type AdultContentPolicy = "yes" | "restricted" | "no";
export type UsageFitTable = Record<ModelId, Record<UsageGroup, FitLevel>>;
export type FactualReliabilityLevel = "high" | "medium" | "low";
export type SearchQualityLevel = "integrated" | "available" | "limited" | "none";
export type LongContextLevel = "very_high" | "high" | "medium" | "low";
export type InstructionFollowingLevel = "excellent" | "good" | "fair" | "poor";
export type TraditionalChineseLevel = "native" | "natural" | "functional" | "poor";
export type MemoryLevel = "persistent" | "manual" | "none";
export type ResponseSpeedLevel = "fast" | "moderate" | "slow";
export type SensitiveTopicLevel = "open" | "cautious" | "restrictive";

export interface ProductCapabilities {
  factual_reliability: FactualReliabilityLevel;
  search_quality: SearchQualityLevel;
  long_context: LongContextLevel;
  instruction_following: InstructionFollowingLevel;
  traditional_chinese_naturalness: TraditionalChineseLevel;
  cross_conversation_memory: MemoryLevel;
  response_speed: ResponseSpeedLevel;
  sensitive_topic_handling: SensitiveTopicLevel;
  adult_content_allowed: AdultContentPolicy;
}
export type ProductCapabilityMatrix = Record<ModelId, ProductCapabilities>;
export type FreePlanMessageLimitTier = "very_generous" | "generous" | "limited" | "very_limited";
export type QuotaToleranceLevel = "generous" | "moderate" | "tight" | "none";
type PendingValue<T> = T | "pending";

export interface ProductFreePlan {
  has_free_plan: PendingValue<boolean>;
  free_plan_message_limit: PendingValue<FreePlanMessageLimitTier>;
  free_plan_quota_tolerance: PendingValue<QuotaToleranceLevel>;
  free_long_context_available: PendingValue<boolean>;
  free_search_available: PendingValue<boolean>;
  free_memory_available: PendingValue<boolean>;
  free_adult_content_allowed: PendingValue<AdultContentPolicy>;
}
export type FreePlanFeasibilityTable = Record<ModelId, ProductFreePlan>;
export type EvidenceKind = "official_documentation" | "official_product_page" | "ui_observation" | "controlled_test" | "policy_page";
export type EvidenceConfidence = "high" | "medium" | "low";

export interface CapabilityEvidence {
  sourceLabel: string;
  sourceUrl: string;
  observedAt: string;
  evidenceKind: EvidenceKind;
  confidence: EvidenceConfidence;
}

export interface ProductDataMetadata {
  modelId: ModelId;
  observedAt: string;
  evidence: readonly CapabilityEvidence[];
}
