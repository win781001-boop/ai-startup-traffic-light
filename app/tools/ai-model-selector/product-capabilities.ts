// ?��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��???// AI Model Selector ??Product Capabilities Data Contract
//
// This file is the formal data contract for the recommendation engine.
// It defines the shape of all product-level capability data, usage fit
// mappings, and free-plan feasibility information.
//
// Status: TYPE DEFINITIONS ONLY ??no product values, no scoring logic,
//         no recommendation engine code.
//
// Frozen: All field names, interface shapes, and enum value names.
// Not frozen: Numeric thresholds for LongContextLevel and
//             FreePlanMessageLimitTier; integrated/available boundary
//             for SearchQualityLevel.
// ?��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��???
import type { ModelId } from "./data";
import type { UsageGroup } from "./rules";


// ?��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��???// Shared types
// ?��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��???
// ?�?�?� FitLevel ?�?�?�
// Usage Fit Table cell value. Answers: "Is this model a good fit
// for this usage scenario?"
// Frozen: enum name + all 4 values.
export type FitLevel =
  | "strong_fit"   // ?��?強�?，該 usage group ?�此模�?首選?�薦?�由
  | "workable"     // ?��?任�?但�?�?��?�場??  | "weak_fit"     // ?�用但�?驗�?顯�?如主流方�?  | "unsuitable";  // ?�能缺失?�政策�?止�?不建議�?�?
// ?�?�?� AdultContentPolicy ?�?�?�
// Policy stance on adult/NSFW content. Shared between ProductCapabilityMatrix
// and FreePlanFeasibilityTable.
// Frozen: enum name + all 3 values.
export type AdultContentPolicy =
  | "yes"          // ?�許，�?標�??��?
  | "restricted"   // ?��?度�?許�??��?較嚴
  | "no";          // 不�?�?

// ?��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��???// Block 1: Usage Fit Table
// Role: First-layer screening. Given the user's selected usage groups,
//       which products are worth comparing further?
// Does NOT cover pricing, policy, or fine-grained capability comparisons.
// ?��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��???
// Frozen: entire table shape.
export type UsageFitTable = Record<ModelId, Record<UsageGroup, FitLevel>>;


// ?��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��???// Block 2: Product Capability Matrix
// Role: Fine-grained per-dimension comparison.
//       When Usage Fit Table narrows to 2-3 candidates, this matrix
//       provides the capability-level data for strong comparison and
//       tradeoff evaluation. free_plan_quota_tolerance lives in the
//       FreePlanFeasibility block, not here.
// ?��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��??��???
// ?�?�?� FactualReliabilityLevel ?�?�?�
// Frozen: enum name + all 3 values.
export type FactualReliabilityLevel =
  | "high"     // 事實�?��?��?，幻覺�?
  | "medium"   // ?�爾?�幻覺�??��??��?
  | "low";     // 經常?��??��??��?�?
// ?�?�?� SearchQualityLevel ?�?�?�
// Frozen: enum name + 4-level structure. NOT frozen: integrated vs available
// boundary. "integrated" = search is a first-class feature (auto-triggered or
// deeply integrated in the UI). "available" = search can be manually enabled.
export type SearchQualityLevel =
  | "integrated"   // ?��??��??��?
  | "available"    // ?��??��??��?�?  | "limited"      // ?��??�能?��?多�???  | "none";        // ?�網路�?尋能??
// ?�?�?� LongContextLevel ?�?�?�
// Frozen: enum name + 4-level structure. NOT frozen: numeric token threshold.
// Levels express relative ranking, not absolute window size.
export type LongContextLevel =
  | "very_high"    // ?��?類產?�中?�於?��?水�?
  | "high"         // ?��??��?表現?�好
  | "medium"       // ?��??�中等長度�?上�???  | "low";         // 上�??�長度�???
// ?�?�?� InstructionFollowingLevel ?�?�?�
// Frozen: enum name + all 4 values.
export type InstructionFollowingLevel =
  | "excellent"    // 精確?�循複�??�示
  | "good"         // 大�??��??�遵�?  | "fair"         // ?�爾?�離
  | "poor";        // 常自行修?�方??
// ?�?�?� TraditionalChineseLevel ?�?�?�
// Frozen: enum name + all 4 values.
export type TraditionalChineseLevel =
  | "native"       // ?��?繁�?中�?，自?�使?�台??���?  | "natural"      // 流暢但偶?��?大陸?��?
  | "functional"   // ?��?�???�硬
  | "poor";        // ?�顯?��?語水�?
// ?�?�?� MemoryLevel ?�?�?�
// Frozen: enum name + all 3 values.
// "manual" means memory exists but requires user setup or context creation.
export type MemoryLevel =
  | "persistent"   // ?��?跨�?話�??��?使用?�無?�?��?設�?
  | "manual"       // 記憶?�能存在，�??�使用?�主?�設定�?建�?上�???  | "none";        // ?�跨對話記憶?�能

// ?�?�?� ResponseSpeedLevel ?�?�?�
// Frozen: enum name + all 3 values.
export type ResponseSpeedLevel =
  | "fast"         // ?��??��?
  | "moderate"     // ?�接??  | "slow";        // ?�顯延遲

// ?�?�?� SensitiveTopicLevel ?�?�?�
// Frozen: enum name + all 3 values.
export type SensitiveTopicLevel =
  | "open"         // 細緻?��??��?主�?，�??��?
  | "cautious"     // ?��??��?常�??�責?��?
  | "restrictive"; // ?��??��??��??��?

// ?�?�?� ProductCapabilities interface ?�?�?�
// Frozen: all field names + all enum types.
// Contains 5 strong-comparison, 3 tradeoff, and 1 policy dimension.
export interface ProductCapabilities {
  // Strong comparison dimensions（優?��??�維度�?
  factual_reliability: FactualReliabilityLevel;
  search_quality: SearchQualityLevel;
  long_context: LongContextLevel;
  instruction_following: InstructionFollowingLevel;
  traditional_chinese_naturalness: TraditionalChineseLevel;

  // Tradeoff dimensions（�??�維度�?
  cross_conversation_memory: MemoryLevel;
  response_speed: ResponseSpeedLevel;
  sensitive_topic_handling: SensitiveTopicLevel;

  // Policy dimension（政策檢?��?
  adult_content_allowed: AdultContentPolicy;
}

// ?�?�?� ProductCapabilityMatrix ?�?�?�
// Full table: all 5 products x 9 capability fields = 45 cells.
// Frozen: entire table shape.
export type ProductCapabilityMatrix = Record<ModelId, ProductCapabilities>;


// ������������������������������������������������������������������������������������������������������������������������������
// Block 3: Free Plan Feasibility Table
// ������������������������������������������������������������������������������������������������������������������������������
// Role: Plan-level feasibility check.
//       Used when budgetPreference === "free_only" or any free_plan_*
//       PlanFeasibilityCheckTrigger is fired. Does NOT compare product
//       quality - only whether the free tier supports the user's needs.
// ������������������������������������������������������������������������������������������������������������������������������
//
// FreePlanMessageLimitTier
// Frozen: enum name + 4-level structure. NOT frozen: numeric threshold.
// Represents the free plan message/usage volume tier.
// This is a secondary factor for daily/heavy usage eligibility;
// it must be combined with QuotaToleranceLevel for primary eligibility decisions.
//
//   very_generous  - Free tier allows high message volume; suitable for daily use.
//   generous       - Free tier allows moderate message volume.
//   limited        - Free tier has noticeable message caps.
//   very_limited   - Free tier is severely restricted; unsuitable for regular use.
export type FreePlanMessageLimitTier =
  | "very_generous"
  | "generous"
  | "limited"
  | "very_limited";

//
// QuotaToleranceLevel
// Frozen: enum name + all 4 values.
// Represents how well the free plan's quota holds up under repeated usage pressure.
// This is the PRIMARY field for evaluating whether a free plan can serve as a
// daily-driver or heavy-use primary tool (when combined with UsageFrequency).
//
//   generous  - Quota is abundant; tolerates daily or heavy usage well.
//   moderate  - Quota handles regular use but may feel tight under heavy load.
//   tight     - Quota is easily exhausted; unsuitable for daily or heavy use.
//   none      - Effectively no free quota for practical use.
export type QuotaToleranceLevel =
  | "generous"
  | "moderate"
  | "tight"
  | "none";

//

// PendingValue<T>
// Wraps a type to allow either a confirmed value or "pending" (evidence
// insufficient to assign a value). Used by ProductFreePlan fields that
// have not yet been researched or confirmed.
// NOT frozen: utility type, may be extended with "unknown" or "inferred"
//             in the future.
type PendingValue<T> = T | "pending";

// ProductFreePlan interface
// Frozen: all field names + all enum/boolean types.
// Describes each product's free plan offering. All fields are feasibility-only;
// they compare plan adequacy, NOT product quality or feature depth.
export interface ProductFreePlan {
  // Whether this product offers a free plan at all.
  // Does NOT by itself indicate suitability as a daily driver.
  has_free_plan: PendingValue<boolean>;

  // Free plan message/usage volume tier.
  // Secondary factor for daily/heavy usage eligibility evaluation.
  free_plan_message_limit: PendingValue<FreePlanMessageLimitTier>;

  // Free plan quota tolerance under repeated usage pressure.
  // PRIMARY factor for daily/heavy usage eligibility.
  // Expected future evaluation: combination of this + FreePlanMessageLimitTier
  // + UsageFrequency from the questionnaire context.
  free_plan_quota_tolerance: PendingValue<QuotaToleranceLevel>;

  // Feature availability on the free plan
  free_long_context_available: PendingValue<boolean>;
  free_search_available: PendingValue<boolean>;
  free_memory_available: PendingValue<boolean>;
  free_adult_content_allowed: PendingValue<AdultContentPolicy>;
}

//
// FreePlanFeasibilityTable
// Full table: all 5 products x 7 fields = 35 cells.
// Frozen: entire table shape.
export type FreePlanFeasibilityTable = Record<ModelId, ProductFreePlan>;

// ������������������������������������������������������������������������������������������������������������������������������
// Block 4: Product Data Evidence Metadata
// ������������������������������������������������������������������������������������������������������������������������������
// This block defines the minimal evidence contract for product data.
// It does NOT populate any product values. The actual data will live
// in a separate product-capability-data.ts file (not yet created).
//
// Future data file shape (approximate, subject to change):
//   - productCapabilityMatrix: ProductCapabilityMatrix (as const satisfies)
//   - freePlanFeasibilityTable: FreePlanFeasibilityTable (as const satisfies)
//   - productDataMetadata: Record<ModelId, ProductDataMetadata>
// ������������������������������������������������������������������������������������������������������������������������������

//
// EvidenceKind
// Frozen: all 5 values.
// Classifies how a piece of capability evidence was obtained.
export type EvidenceKind =
  | 'official_documentation'
  | 'official_product_page'
  | 'ui_observation'
  | 'controlled_test'
  | 'policy_page';

//
// EvidenceConfidence
// Frozen: all 3 values.
// Confidence level for a piece of capability evidence.
export type EvidenceConfidence =
  | 'high'
  | 'medium'
  | 'low';

//
// CapabilityEvidence
// A single evidence record supporting a product capability or free plan value.
// Multiple evidence records can be grouped per product.
// This is NOT embedded in ProductCapabilities or ProductFreePlan.
export interface CapabilityEvidence {
  sourceLabel: string;
  sourceUrl: string;
  observedAt: string;
  evidenceKind: EvidenceKind;
  confidence: EvidenceConfidence;
}

//
// ProductDataMetadata
// Per-product metadata bundle, referenced alongside capability and free plan data.
// Stored separately from ProductCapabilities / ProductFreePlan to keep
// value types flat and comparable.
export interface ProductDataMetadata {
  modelId: ModelId;
  observedAt: string;
  evidence: readonly CapabilityEvidence[];
}
