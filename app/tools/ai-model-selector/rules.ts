// === Rule input layer / decision context builder for AI Model Selector ===
// This file is NOT a recommendation engine. It produces no product names,
// scores, rankings, or "product A is better than product B" conclusions.
import type { ModelId } from "./data";
import { freePlanFeasibilityTable } from "./product-capability-data";
import { USAGE_CANDIDATE_EVIDENCE } from "./usage-candidate-data";
import type { UsageCategory } from "./usage-candidate-data";

// ----------------------------------------------------------------------------------------------------
// Output types
// ----------------------------------------------------------------------------------------------------

// Category 1: Usage groups (使用群�?)
export type UsageGroup =
  | "text_creation"
  | "document_work"
  | "research"
  | "table_and_numbers"
  | "presentation_structure"
  | "coding"
  | "image_generation"
  | "image_editing"
  | "video_script"
  | "video_generation"
  | "transcript_and_video_summary";

// Category 2: Interaction tags (互�??��?標籤)
export type InteractionTag =
  | "interaction_direct_request"
  | "interaction_iterative_discussion"
  | "interaction_draft_revision"
  | "interaction_step_by_step_guidance"
  | "interaction_prompt_collaboration"
  | "interaction_reference_following";

// Category 3A: Strong comparison candidates
export type StrongComparisonCandidate =
  | "factual_reliability"
  | "search_and_source_verification"
  | "long_context_understanding"
  | "instruction_following_and_precise_revision"
  | "traditional_chinese_and_taiwan_language_naturalness"
  | "plan_limit_tolerance";

// Category 3B: Supporting tradeoff conditions (輔助權衡條件)
export type SupportingTradeoffCondition =
  | "cross_conversation_continuity"
  | "response_speed"
  | "cross_platform_convenience"
  | "sensitive_topic_response_completeness";

// Category 3C: Policy check triggers (?��?檢查觸發)
export type PolicyCheckTrigger =
  | "adult_content_policy_check_required";

// Category 3D: Reminder triggers (?��?觸發)
export type ReminderTrigger =
  | "privacy_reminder_required";

// Composite rule IDs (複�?規�?識別�?
export type CompositeRuleId =
  | "research_search_verification_is_strong_candidate"
  | "research_factual_reliability_is_strong_candidate"
  | "long_document_understanding_is_strong_candidate"
  | "coding_precise_revision_is_strong_candidate"
  | "taiwanese_chinese_rewriting_is_strong_candidate"
  | "reference_fidelity_is_important"
  | "adult_content_policy_check_required"
  | "privacy_reminder_required";

export type BudgetPreference =
  | "free_only"
  | "up_to_300"
  | "from_300_to_600"
  | "from_600_to_1000"
  | null;

export type UsageFrequency =
  | "rare"
  | "weekly"
  | "daily"
  | "heavy"
  | null;

export type PlanFeasibilityCheckTrigger =
  | "free_plan_required"
  | "high_frequency_plan_capacity_check_required"
  | "heavy_usage_plan_capacity_check_required"
  | "free_high_frequency_limit_check_required"
  | "free_heavy_usage_limit_check_required"
  | "free_plan_quota_tolerance_check_required"
  | "free_long_context_availability_check_required"
  | "free_search_availability_check_required"
  | "free_memory_availability_check_required"
  | "free_adult_policy_and_plan_check_required";

// Category 5: User maturity and guidance adjustment layer (?�戶?��?度�?影響引�??�現)
export type AiExperienceLevel =
  | "none"
  | "few"
  | "regular"
  | "proficient"
  | null;

export type PromptSkillLevel =
  | "no"
  | "simple"
  | "refine"
  | "expert"
  | null;

export type GuidanceAdjustmentTrigger =
  | "onboarding_support_needed"
  | "migration_cost_reminder_needed"
  | "advanced_comparison_explanation_needed";

// === Main output: Rule context ===

export interface SelectorRuleContext {
  selectedOptionIds: readonly string[];
  unmappedOptionIds: readonly string[];
  contextKeys: readonly ContextKey[];
  strongCompareKeys: readonly ContextKey[];
  tradeoffKeys: readonly ContextKey[];
  reminderKeys: readonly ContextKey[];
  primaryLimitKeys: readonly ContextKey[];
  reminderOnlyKeys: readonly ContextKey[];
}

// ----------------------------------------------------------------------------------------------------
// Public API: buildSelectorRuleContext
// ----------------------------------------------------------------------------------------------------
// Builds a SelectorRuleContext from selected option IDs.
// Single source of truth: QUESTION_OPTION_RULE_MAPPINGS.
// No product comparison, scoring, or ranking logic.
// ----------------------------------------------------------------------------------------------------

/**
 * Build a SelectorRuleContext from the user-selected option IDs.
 * @param selectedOptionIds - Flat array of all selected option IDs across all 5 categories.
 * @returns SelectorRuleContext with categorized context keys.
 */
export function buildSelectorRuleContext(
  usageIds: readonly string[],
  howUseIds: readonly string[],
  priorityIds: readonly string[],
  budgetIds: readonly string[],
  currentIds: readonly string[],
): SelectorRuleContext {
  const selectedOptionIds = [
    ...usageIds,
    ...howUseIds,
    ...priorityIds,
    ...budgetIds,
    ...currentIds,
  ];

  const seenOptionIds = new Set<string>();
  const seenContextKeys = new Set<string>();
  const seenStrong = new Set<string>();
  const seenTradeoff = new Set<string>();
  const seenReminder = new Set<string>();
  const seenLimit = new Set<string>();
  const seenReminderOnly = new Set<string>();

  const mappedIds: string[] = [];
  const unmappedIds: string[] = [];
  const contextKeys: ContextKey[] = [];
  const strongCompareKeys: ContextKey[] = [];
  const tradeoffKeys: ContextKey[] = [];
  const reminderKeys: ContextKey[] = [];
  const primaryLimitKeys: ContextKey[] = [];
  const reminderOnlyKeys: ContextKey[] = [];

  for (const id of selectedOptionIds) {
    const entry = QUESTION_OPTION_RULE_MAPPINGS.find((m) => m.optionId === id);

    if (!entry) {
      // Unmapped option ID ??collect and continue
      if (!seenOptionIds.has(id)) {
        seenOptionIds.add(id);
        unmappedIds.push(id);
      }
      continue;
    }

    // Track mapped IDs (dedup, preserve order)
    if (!seenOptionIds.has(id)) {
      seenOptionIds.add(id);
      mappedIds.push(id);
    }

    const key = entry.contextKey;

    // All mapped context keys
    if (!seenContextKeys.has(key)) {
      seenContextKeys.add(key);
      contextKeys.push(key);
    }

    // strongCompareKeys
    if ((entry.ruleTypes as readonly RuleType[]).includes("strongCompare") && !seenStrong.has(key)) {
      seenStrong.add(key);
      strongCompareKeys.push(key);
    }

    // tradeoffKeys
    if ((entry.ruleTypes as readonly RuleType[]).includes("tradeoff") && !seenTradeoff.has(key)) {
      seenTradeoff.add(key);
      tradeoffKeys.push(key);
    }

    // reminderKeys
    if ((entry.ruleTypes as readonly RuleType[]).includes("reminder") && !seenReminder.has(key)) {
      seenReminder.add(key);
      reminderKeys.push(key);
    }

    // primaryLimitKeys
    if (entry.primaryEligibilityEffect === "limit" && !seenLimit.has(key)) {
      seenLimit.add(key);
      primaryLimitKeys.push(key);
    }

    // reminderOnlyKeys
    if (entry.reminderOnly && !seenReminderOnly.has(key)) {
      seenReminderOnly.add(key);
      reminderOnlyKeys.push(key);
    }
  }

  return {
    selectedOptionIds: mappedIds,
    unmappedOptionIds: unmappedIds,
    contextKeys,
    strongCompareKeys,
    tradeoffKeys,
    reminderKeys,
    primaryLimitKeys,
    reminderOnlyKeys,
  };
}
// ----------------------------------------------------------------------------------------------------
// Phase R-next-1: Option ??Context / Rule metadata mapping
// ----------------------------------------------------------------------------------------------------
// This block defines the formal option-to-rule metadata skeleton.
// It maps each questionnaire option ID to its rule evaluation
// context key, rule types, primary eligibility effect, and
// reminder-only flag. No product data, scores, or ranking logic.
// ----------------------------------------------------------------------------------------------------

export type RuleType = 'strongCompare' | 'tradeoff' | 'reminder';

export type PrimaryEligibilityEffect = 'none' | 'limit';

export interface OptionRuleMapping {
  optionId: string;
  contextKey: string;
  ruleTypes: readonly RuleType[];
  primaryEligibilityEffect: PrimaryEligibilityEffect;
  reminderOnly: boolean;
}

/**
 * Complete option-to-rule mapping for the 5-category selector.
 * Each entry maps a questionnaire option ID to its rule evaluation context.
 * Queryable by optionId via array lookup.
 */
export const QUESTION_OPTION_RULE_MAPPINGS = [
// --- Category 1: usage ---
  { optionId: 'writing_article',     contextKey: 'writingLongForm',              ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'writing_email',       contextKey: 'writingCommunication',         ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'writing_rewrite',     contextKey: 'writingRevision',              ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'document_summary',    contextKey: 'longDocumentSummary',          ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'document_meeting',    contextKey: 'meetingNotesWorkflow',         ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'document_organize',   contextKey: 'contentOrganization',          ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'research_latest',     contextKey: 'latestInfoResearch',           ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'research_compare',    contextKey: 'comparativeResearch',          ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'research_summarize',  contextKey: 'researchSynthesis',            ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'presentation_excel',  contextKey: 'spreadsheetSupport',           ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'presentation_analyze',contextKey: 'dataAnalysisSupport',          ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'presentation_outline',contextKey: 'presentationPlanning',         ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'code_write',          contextKey: 'codeGeneration',               ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'code_debug',          contextKey: 'codeDebugging',                ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'code_website',        contextKey: 'simpleWebBuild',               ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'image_generate',      contextKey: 'imageGeneration',              ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'image_social',        contextKey: 'socialVisualCreation',         ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'image_deck',          contextKey: 'presentationVisualCreation',   ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'image_edit',          contextKey: 'imageEditing',                 ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'video_script',        contextKey: 'videoScriptWriting',           ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'video_material',      contextKey: 'videoMaterialGeneration',      ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'video_subtitle',      contextKey: 'videoTranscriptProcessing',    ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },

// --- Category 2: how_use ---
  { optionId: 'how_use_direct',  contextKey: 'directTaskExecution',    ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'how_use_discuss', contextKey: 'iterativeDiscussion',    ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'how_use_revise',  contextKey: 'revisionWorkflow',       ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'how_use_step',    contextKey: 'stepByStepGuidance',     ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'how_use_prompt',  contextKey: 'promptRefinement',       ruleTypes: ['tradeoff'] as const,       primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'how_use_ref',     contextKey: 'referenceBasedWork',     ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: false },

// --- Category 3: priority ---
  { optionId: 'priority_factual',     contextKey: 'factualReliability',                ruleTypes: ['strongCompare'] as const,                      primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'priority_search',      contextKey: 'searchWithSources',                 ruleTypes: ['strongCompare'] as const,                      primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'priority_context',     contextKey: 'longContextNeed',                    ruleTypes: ['strongCompare'] as const,                      primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'priority_follow',      contextKey: 'instructionFollowingNeed',           ruleTypes: ['strongCompare'] as const,                      primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'priority_traditional', contextKey: 'traditionalChineseNeed',             ruleTypes: ['strongCompare'] as const,                      primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'priority_memory',      contextKey: 'crossChatMemoryNeed',                ruleTypes: ['strongCompare'] as const,                      primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'priority_speed',       contextKey: 'fastResponseNeed',                   ruleTypes: ['tradeoff'] as const,                           primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'priority_quota',       contextKey: 'highAvailabilityNeed',                ruleTypes: ['strongCompare', 'reminder'] as const,           primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'priority_cross',       contextKey: 'crossDeviceNeed',                     ruleTypes: ['tradeoff'] as const,                           primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'priority_sensitive',   contextKey: 'sensitiveTopicFlexibilityNeed',       ruleTypes: ['strongCompare', 'reminder'] as const,           primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'priority_adult',       contextKey: 'adultCreativeToleranceNeed',          ruleTypes: ['strongCompare', 'reminder'] as const,           primaryEligibilityEffect: 'none' as const, reminderOnly: false },
  { optionId: 'priority_privacy',     contextKey: 'privacyPriority',                     ruleTypes: ['strongCompare', 'reminder'] as const,           primaryEligibilityEffect: 'none' as const, reminderOnly: false },

// --- Category 4: budget ---
  { optionId: 'budget_cost_free',  contextKey: 'freeOnly',         ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'limit' as const, reminderOnly: false },
  { optionId: 'budget_cost_300',   contextKey: 'budgetUpTo300',    ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const,  reminderOnly: false },
  { optionId: 'budget_cost_600',   contextKey: 'budgetUpTo600',    ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const,  reminderOnly: false },
  { optionId: 'budget_cost_1000',  contextKey: 'budgetUpTo1000',   ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const,  reminderOnly: false },
  { optionId: 'budget_freq_rare',  contextKey: 'rareUsage',        ruleTypes: ['tradeoff'] as const,       primaryEligibilityEffect: 'none' as const,  reminderOnly: false },
  { optionId: 'budget_freq_weekly',contextKey: 'weeklyUsage',      ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const,  reminderOnly: false },
  { optionId: 'budget_freq_daily', contextKey: 'dailyUsage',       ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'none' as const,  reminderOnly: false },
  { optionId: 'budget_freq_heavy', contextKey: 'heavyUsage',       ruleTypes: ['strongCompare'] as const, primaryEligibilityEffect: 'limit' as const, reminderOnly: false },

// --- Category 5: current ---
  { optionId: 'current_exp_none',        contextKey: 'experienceNone',       ruleTypes: ['reminder'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: true },
  { optionId: 'current_exp_few',         contextKey: 'experienceFew',        ruleTypes: ['reminder'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: true },
  { optionId: 'current_exp_regular',     contextKey: 'experienceRegular',    ruleTypes: ['reminder'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: true },
  { optionId: 'current_exp_proficient',  contextKey: 'experienceProficient', ruleTypes: ['reminder'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: true },
  { optionId: 'current_prompt_no',       contextKey: 'promptSkillNone',      ruleTypes: ['reminder'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: true },
  { optionId: 'current_prompt_simple',   contextKey: 'promptSkillBasic',     ruleTypes: ['reminder'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: true },
  { optionId: 'current_prompt_refine',   contextKey: 'promptSkillRefine',    ruleTypes: ['reminder'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: true },
  { optionId: 'current_prompt_expert',   contextKey: 'promptSkillExpert',    ruleTypes: ['reminder'] as const, primaryEligibilityEffect: 'none' as const, reminderOnly: true },
] as const satisfies readonly OptionRuleMapping[];


// --- Usage option ID to UsageCategory mapping ---
// Maps each UI usage checkbox option ID to its UsageCategory.
const USAGE_OPTION_TO_CATEGORY: Record<string, UsageCategory> = {
  // writing
  writing_article: "writing",
  writing_email: "writing",
  writing_rewrite: "writing",
  // document
  document_summary: "document",
  document_meeting: "document",
  document_organize: "document",
  // research
  research_latest: "research",
  research_compare: "research",
  research_summarize: "research",
  // presentation
  presentation_excel: "presentation",
  presentation_analyze: "presentation",
  presentation_outline: "presentation",
  // code
  code_write: "code",
  code_debug: "code",
  code_website: "code",
  // image
  image_generate: "image",
  image_social: "image",
  image_deck: "image",
  image_edit: "image",
  // video
  video_script: "video",
  video_material: "video",
  video_subtitle: "video",
};

// Derived types from the mapping constant
export type QuestionOptionRuleMapping = (typeof QUESTION_OPTION_RULE_MAPPINGS)[number];
export type ContextKey = QuestionOptionRuleMapping['contextKey'];
// ----------------------------------------------------------------------------------------------------
// Phase R-next-3: RecommendationResult output contract
// ----------------------------------------------------------------------------------------------------
// Defines the formal output type for the future recommendation engine.
// No product scoring, ranking, or actual recommendation logic.
// All reason/tradeoff/reminder codes are machine-readable; no UI text.
// ----------------------------------------------------------------------------------------------------

export interface RecommendationReason {
  contextKey: ContextKey;
  ruleType: RuleType;
  reasonCode: string;
}

export interface RecommendationTradeoff {
  contextKey: ContextKey;
  tradeoffCode: string;
}

export interface RecommendationReminder {
  contextKey: ContextKey;
  reminderCode: string;
}

export interface NotRecommendedProduct {
  productId: ModelId;
  reasonCodes: readonly string[];
}

export type ResultState = "multiple_candidates" | "single_clear_choice" | "needs_further_review";

export interface RecommendationResult {
  primaryRecommendation: ModelId | null;
  secondaryRecommendation: ModelId | null;
  notRecommended: readonly NotRecommendedProduct[];
  reasons: readonly RecommendationReason[];
  tradeoffs: readonly RecommendationTradeoff[];
  reminders: readonly RecommendationReminder[];
  appliedContextKeys: readonly ContextKey[];
  strongCompareCandidates: readonly ModelId[];
  resultState: ResultState;
  unmappedOptionIds: readonly string[];
}

/**
 * Create an empty RecommendationResult with all fields at their null/empty defaults.
 * Use as a starting point before running recommendation rules.
 */
export function createEmptyRecommendationResult(): RecommendationResult {
  return {
    primaryRecommendation: null,
    secondaryRecommendation: null,
    notRecommended: [],
    reasons: [],
    tradeoffs: [],
    reminders: [],
    appliedContextKeys: [],
    strongCompareCandidates: [],
    resultState: "needs_further_review",
    unmappedOptionIds: [],
  };
}

// ----------------------------------------------------------------------------------------------------
// Phase R-next-4: Rule execution entry point
// ----------------------------------------------------------------------------------------------------
// executeRecommendationRules is the single entry point that
// transforms a SelectorRuleContext into a RecommendationResult.
// Execution follows a fixed 5-stage pipeline:
//   1. Primary eligibility limits
//   2. Strong comparisons
//   3. Trade-off evaluation
//   4. Reminder collection
//   5. Result assembly
// ----------------------------------------------------------------------------------------------------

// --- Phase R-next-5: Free + Daily/Heavy Primary Eligibility ---

const ALL_MODEL_IDS: readonly ModelId[] = ["chatgpt", "claude", "gemini", "deepseek", "grok"];

// --- V1 usage candidate evaluator ---
/**
 * Evaluate usage-based candidates from user-selected usage options.
 * Maps selected option IDs to UsageCategory, looks up supported_candidate
 * entries in USAGE_CANDIDATE_EVIDENCE, and produces a union candidate set.
 *
 * V1 categories: writing, document, research, presentation, code, image
 * Excluded from V1: video (data is retained but does not affect recommendations).
 */
function evaluateUsageCandidates(
  context: SelectorRuleContext,
  result: RecommendationResult,
): void {
  // Step 1: Map selected option IDs to unique UsageCategories
  const selectedCategories = new Set<UsageCategory>();
  for (const id of context.selectedOptionIds) {
    const cat = USAGE_OPTION_TO_CATEGORY[id];
    if (cat) {
      selectedCategories.add(cat);
    }
  }

  // Step 2: Only V1 categories �X explicitly exclude video
  const v1Categories: ReadonlySet<UsageCategory> = new Set([
    "writing", "document", "research", "presentation", "code", "image",
  ]);

  // Step 3: Union of supported_candidate products across all selected V1 categories
  const candidateSet = new Set<ModelId>();
  for (const cat of selectedCategories) {
    if (!v1Categories.has(cat)) continue;
    for (const entry of USAGE_CANDIDATE_EVIDENCE) {
      if (entry.usageCategory === cat && entry.status === "supported_candidate") {
        candidateSet.add(entry.modelId);
      }
    }
  }

  // Step 4: Accumulate into strongCompareCandidates (does not replace existing)
  for (const modelId of candidateSet) {
    result.strongCompareCandidates = [...result.strongCompareCandidates, modelId];
  }
}

/**
 * Evaluate free-only + daily/heavy usage primary eligibility.
 * Only activates when ALL conditions are met:
 *   - User selected free_only (budget_cost_free)
 *   - User selected daily OR heavy usage frequency
 *
 *   free_plan_quota_tolerance === "none"                   ??notRecommended (confirmed negative)
 *   free_plan_quota_tolerance === "tight"                   ??reminder strong caution (inferred, cannot exclude)
 *   free_plan_quota_tolerance === "pending"                 ??reminder caution (unknown, cannot exclude)
 *   free_plan_quota_tolerance === "generous" | "moderate" ??no action (sufficient)
 */
function evaluateFreePlusDailyHeavy(
  contextKeys: readonly ContextKey[],
  result: RecommendationResult,
): void {
  const isFreeOnly = contextKeys.includes("freeOnly");
  const isDailyOrHeavy = contextKeys.includes("dailyUsage") || contextKeys.includes("heavyUsage");
  if (!isFreeOnly || !isDailyOrHeavy) return;

  for (const modelId of ALL_MODEL_IDS) {
    const plan = freePlanFeasibilityTable[modelId];
    const quota = plan.free_plan_quota_tolerance;

    // Confirmed negative ("none"): exclude from primary consideration
    if ((quota as string) === "none") {
      result.notRecommended = [
        ...result.notRecommended,
        { productId: modelId, reasonCodes: ["free_quota_insufficient"] },
      ];
      result.reasons = [
        ...result.reasons,
        { contextKey: "freeOnly", ruleType: "reminder", reasonCode: "free_quota_insufficient" },
      ];
      continue;
    }

    // Inferred tight ("tight"): strong caution, not exclusion
    if (quota === "tight") {
      result.reminders = [
        ...result.reminders,
        { contextKey: "freeOnly", reminderCode: `free_quota_tight_caution_${modelId}` },
      ];
      continue;
    }

    // Pending: unknown ??cannot exclude, emit caution reminder
    if (quota === "pending") {
      result.reminders = [
        ...result.reminders,
        { contextKey: "freeOnly", reminderCode: `free_quota_pending_caution_${modelId}` },
      ];
      continue;
    }

    // generous | moderate ??sufficient, no action
  }
}
// --- Adult-content priority gate ---

/**
 * Evaluate adult content priority gate.
 * Only activates when user selected priority_adult (adultCreativeToleranceNeed).
 *
 *   free_adult_content_allowed === "no"          ??notRecommended (confirmed prohibited)
 *   free_adult_content_allowed === "restricted"   ??reminder strong caution (not exclusion)
 *   free_adult_content_allowed === "yes"          ??positive reason (sufficient)
 *   free_adult_content_allowed === "pending"      ??reminder caution (unknown, cannot exclude)
 */
function evaluateAdultContentGate(
  contextKeys: readonly ContextKey[],
  result: RecommendationResult,
): void {
  if (!contextKeys.includes("adultCreativeToleranceNeed")) return;

  for (const modelId of ALL_MODEL_IDS) {
    const policy = freePlanFeasibilityTable[modelId].free_adult_content_allowed;

    // Confirmed prohibited ("no"): exclude from primary consideration
    if ((policy as string) === "no") {
      result.notRecommended = [
        ...result.notRecommended,
        { productId: modelId, reasonCodes: ["adult_content_prohibited"] },
      ];
      result.reasons = [
        ...result.reasons,
        { contextKey: "adultCreativeToleranceNeed", ruleType: "reminder", reasonCode: "adult_content_prohibited" },
      ];
      continue;
    }

    // Restricted ("restricted"): strong caution, not exclusion
    if (policy === "restricted") {
      result.reminders = [
        ...result.reminders,
        { contextKey: "adultCreativeToleranceNeed", reminderCode: `adult_content_restricted_caution_${modelId}` },
      ];
      continue;
    }

    // Allowed ("yes"): positive signal for strong comparison
    if ((policy as string) === "yes") {
      result.reasons = [
        ...result.reasons,
        { contextKey: "adultCreativeToleranceNeed", ruleType: "strongCompare", reasonCode: `adult_content_allowed_${modelId}` },
      ];
      continue;
    }

    // Pending: unknown ??cannot form any conclusion, emit caution reminder
    if (policy === "pending") {
      result.reminders = [
        ...result.reminders,
        { contextKey: "adultCreativeToleranceNeed", reminderCode: `adult_content_pending_caution_${modelId}` },
      ];
      continue;
    }
  }
}

// --- Search priority strong compare ---

/**
 * Evaluate search priority as a strong comparison dimension.
 * Only activates when user selected priority_search (searchWithSources).
 *
 *   free_search_available === true       ??positive strongCompare reason
 *   free_search_available === false       ??reserved for future confirmed-negative handling
 *   free_search_available === "pending"   ??reminder caution (unknown, cannot form positive signal)
 */
function evaluateSearchPriorityStrongCompare(
  contextKeys: readonly ContextKey[],
  result: RecommendationResult,
): void {
  if (!contextKeys.includes("searchWithSources")) return;

  for (const modelId of ALL_MODEL_IDS) {
    const available = freePlanFeasibilityTable[modelId].free_search_available;

    // Confirmed true: positive strong comparison signal
    if (available === true) {
      result.reasons = [
        ...result.reasons,
        { contextKey: "searchWithSources", ruleType: "strongCompare", reasonCode: `search_available_${modelId}` },
      ];
      result.strongCompareCandidates = [...result.strongCompareCandidates, modelId];
      continue;
    }

    // Confirmed false: reserved for future use when confirmed-false data exists
    // Currently no product has free_search_available === false, so this branch
    // is defined for completeness but produces no output yet.
    if ((available as unknown) === false) {
      // reserved: notRecommended or negative strongCompare
      continue;
    }

    // Pending: unknown ??cannot form any conclusion, emit caution reminder
    if (available === "pending") {
      result.reminders = [
        ...result.reminders,
        { contextKey: "searchWithSources", reminderCode: `search_pending_caution_${modelId}` },
      ];
      continue;
    }
  }
}

// --- Memory priority strong compare ---

/**
 * Evaluate memory priority as a strong comparison dimension.
 * Only activates when user selected priority_memory (crossChatMemoryNeed).
 *
 *   free_memory_available === true       ??positive strongCompare reason
 *   free_memory_available === false       ??reserved for future confirmed-negative handling
 *   free_memory_available === "pending"   ??reminder caution (unknown, cannot form positive signal)
 */
function evaluateMemoryPriorityStrongCompare(
  contextKeys: readonly ContextKey[],
  result: RecommendationResult,
): void {
  if (!contextKeys.includes("crossChatMemoryNeed")) return;

  for (const modelId of ALL_MODEL_IDS) {
    const available = freePlanFeasibilityTable[modelId].free_memory_available;

    // Confirmed true: positive strong comparison signal
    if (available === true) {
      result.reasons = [
        ...result.reasons,
        { contextKey: "crossChatMemoryNeed", ruleType: "strongCompare", reasonCode: `memory_available_${modelId}` },
      ];
      result.strongCompareCandidates = [...result.strongCompareCandidates, modelId];
      continue;
    }

    // Confirmed false: reserved for future use when confirmed-false data exists
    if ((available as unknown) === false) {
      // reserved: notRecommended or negative strongCompare
      continue;
    }

    // Pending: unknown ??cannot form any conclusion, emit caution reminder
    if (available === "pending") {
      result.reminders = [
        ...result.reminders,
        { contextKey: "crossChatMemoryNeed", reminderCode: `memory_pending_caution_${modelId}` },
      ];
      continue;
    }
  }
}


// --- StrongCompare candidate aggregation ---

/**
 * Collect and deduplicate strongCompare candidates that accumulated
 * across Stage 2 evaluators. Products in the returned list have
 * received at least one positive strongCompare signal.
 *
 * This function reads from result.strongCompareCandidates, which was
 * populated alongside result.reasons by each strongCompare evaluator.
 * No fragile reasonCode string parsing is involved.
 */
function collectStrongCompareCandidates(result: RecommendationResult): void {
  const seen = new Set<ModelId>();
  const out: ModelId[] = [];
  for (const id of result.strongCompareCandidates) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  result.strongCompareCandidates = out;
}




// --- Result-state assembly ---

/**
 * Assemble a minimal result shape from strongCompareCandidates.
 * Does NOT perform full sorting ??only sets state and primary when
 * a single clear choice emerges.
 *
 *   strongCompareCandidates.length >= 2  ??resultState = "multiple_candidates"
 *   strongCompareCandidates.length === 1  ??resultState = "single_clear_choice",
 *                                           primaryRecommendation = that product
 *   strongCompareCandidates.length === 0  ??resultState = "needs_further_review" (default)
 */
function assembleResultState(result: RecommendationResult): void {
  if (result.notRecommended.length > 0) {
    // Primary exclusion exists; do not override state from candidates alone.
    // Keep default "needs_further_review" until exclusions are resolved.
    return;
  }

  if (result.strongCompareCandidates.length >= 2) {
    result.resultState = "multiple_candidates";
    return;
  }

  if (result.strongCompareCandidates.length === 1) {
    result.resultState = "single_clear_choice";
    result.primaryRecommendation = result.strongCompareCandidates[0];
    return;
  }

  // No candidates ??keep default "needs_further_review"
}


function deduplicateReminders(
  reminders: readonly RecommendationReminder[],
): readonly RecommendationReminder[] {
  const seen = new Set<string>();
  const out: RecommendationReminder[] = [];
  for (const r of reminders) {
    const key = `${r.contextKey}::${r.reminderCode}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

function deduplicateReasons(
  reasons: readonly RecommendationReason[],
): readonly RecommendationReason[] {
  const seen = new Set<string>();
  const out: RecommendationReason[] = [];
  for (const r of reasons) {
    const key = `${r.contextKey}::${r.ruleType}::${r.reasonCode}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

function deduplicateNotRecommended(
  list: readonly NotRecommendedProduct[],
): readonly NotRecommendedProduct[] {
  const seen = new Set<string>();
  const out: NotRecommendedProduct[] = [];
  for (const item of list) {
    const key = `${item.productId}::${[...item.reasonCodes].sort().join(",")}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/**
 * V1 Strong convergence rules: product-strategy-level first-try recommendations.
 * When a rule matches, it fully determines the result and returns true.
 * When no rule matches, returns false and the existing pipeline continues.
 * Must run before any evaluator that adds to strongCompareCandidates.
 */
function applyV1StrongConvergence(
  context: SelectorRuleContext,
  result: RecommendationResult,
): boolean {
  const ids = context.selectedOptionIds;
  const has = (id: string): boolean => ids.includes(id);

  // 1. Adult content -> single choice Grok (highest priority)
  if (has("priority_adult")) {
    result.resultState = "single_clear_choice";
    result.primaryRecommendation = "grok";
    result.strongCompareCandidates = ["grok"];
    return true;
  }

  // 2. Image generation (no adult) -> single choice Gemini
  if (has("image_generate") && !has("priority_adult")) {
    result.resultState = "single_clear_choice";
    result.primaryRecommendation = "gemini";
    result.strongCompareCandidates = ["gemini"];
    return true;
  }

  // 3. Cross-chat memory (no adult, no image) -> ChatGPT + Gemini dual candidates
  if (has("priority_memory") && !has("priority_adult") && !has("image_generate")) {
    result.resultState = "multiple_candidates";
    result.strongCompareCandidates = ["chatgpt", "gemini"];
    return true;
  }

  // 4. Free + document work (no adult, no image, no memory) -> single choice DeepSeek
  const hasDocument: boolean = has("document_summary") || has("document_meeting") || has("document_organize");
  if (has("budget_cost_free") && hasDocument && !has("priority_adult") && !has("image_generate") && !has("priority_memory")) {
    result.resultState = "single_clear_choice";
    result.primaryRecommendation = "deepseek";
    result.strongCompareCandidates = ["deepseek"];
    return true;
  }

  return false;
}

/**
 * Execute recommendation rules against a SelectorRuleContext.
 * @param context - The rule context built from user selections.
 * @returns RecommendationResult with primary/secondary recommendations,
 *          tradeoffs, reminders, and applied context metadata.
 */
function executeRecommendationRules(
  context: SelectorRuleContext,
): RecommendationResult {
  const result = createEmptyRecommendationResult();


  // --- Stage 0: V1 strong convergence rules (short-circuits when matched) ---
  if (applyV1StrongConvergence(context, result)) {
    result.appliedContextKeys = context.contextKeys;
    result.unmappedOptionIds = context.unmappedOptionIds;
    return result;
  }

  // --- Stage 1: Primary eligibility limits ---
  evaluateFreePlusDailyHeavy(context.contextKeys, result);
  evaluateAdultContentGate(context.contextKeys, result);

  evaluateUsageCandidates(context, result);
  evaluateSearchPriorityStrongCompare(context.contextKeys, result);
  evaluateMemoryPriorityStrongCompare(context.contextKeys, result);
  collectStrongCompareCandidates(result);

  // --- Stage 3: Trade-off evaluation ---
  // --- Stage 4: Reminder collection ---

  // --- Stage 5: Result assembly ---
  result.notRecommended = deduplicateNotRecommended(result.notRecommended);
  result.reasons = deduplicateReasons(result.reasons);
  result.reminders = deduplicateReminders(result.reminders);
  assembleResultState(result);
  result.appliedContextKeys = context.contextKeys;
  result.unmappedOptionIds = context.unmappedOptionIds;
  return result;
}

// --- Missing: `return result;` here in the source file ---

/**
 * Convenience helper: compose buildSelectorRuleContext + executeRecommendationRules.
 * @param selectedOptionIds - Flat array of all selected option IDs.
 * @returns RecommendationResult from the full pipeline.
 */
export function recommendFromOptionIds(
  selectedOptionIds: readonly string[],
): RecommendationResult {
  const context = buildSelectorRuleContext(
    selectedOptionIds, [], [], [], []
  );
  return executeRecommendationRules(context);
}
