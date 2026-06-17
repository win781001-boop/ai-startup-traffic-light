import type { IdeaInput } from "@/app/api/analyze-idea/route";
import { upstashExec } from "@/lib/rate-limit";

// ─── Types ───

export interface TavilySearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchContext {
  results: TavilySearchResult[];
  succeeded: boolean;
}

interface TavilyApiResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
  }>;
}

// ─── Constants ───

const MAX_SEARCHES = 3;
const MAX_RESULTS_PER_SEARCH = 3;
const MAX_SNIPPET_LENGTH = 200;
const SEARCH_TIMEOUT_MS = 5000;
const TOTAL_TIMEOUT_MS = 15000;

// ??? Tavily daily budget guard ???

const TAVILY_BUDGET_KEY_PREFIX = "tavily:usage:";
const memoryBudgetStore = new Map<string, number>();

function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return TAVILY_BUDGET_KEY_PREFIX + y + "-" + m + "-" + day;
}

/**
 * Check whether today\'s Tavily usage is under the daily limit.
 * Returns { allowed, remaining }.
 *
 * Backend:
 *   - Upstash Redis REST (if UPSTASH_* env vars configured)
 *   - In-memory Map (fallback)
 *
 * IMPORTANT: In-memory fallback resets on every serverless cold start
 * and does NOT count across instances. Production MUST configure Upstash
 * for the budget guard to be reliable.
 */
async function checkTavilyBudget(): Promise<{ allowed: boolean; remaining: number }> {
  const limitStr = process.env.TAVILY_DAILY_LIMIT;
  const limit = limitStr ? parseInt(limitStr, 10) : 300;
  if (limit <= 0) return { allowed: false, remaining: 0 };

  const key = getTodayKey();
  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  const useUpstash = UPSTASH_URL.length > 0 && UPSTASH_TOKEN.length > 0;

  if (useUpstash) {
    try {
      const results = await upstashExec([["GET", key]]);
      const current = typeof results[0] === "string" ? parseInt(results[0], 10) : 0;
      return { allowed: current < limit, remaining: Math.max(0, limit - current) };
    } catch (err) {
      console.warn("[tavily-budget] Upstash error, falling back to memory:", err instanceof Error ? err.message : err);
    }
  }

  // In-memory fallback
  const current = memoryBudgetStore.get(key) ?? 0;
  return { allowed: current < limit, remaining: Math.max(0, limit - current) };
}

/**
 * Increment today\'s Tavily usage counter by 1.
 */
async function incrementTavilyUsage(): Promise<void> {
  const key = getTodayKey();
  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  const useUpstash = UPSTASH_URL.length > 0 && UPSTASH_TOKEN.length > 0;

  if (useUpstash) {
    try {
      await upstashExec([
        ["INCR", key],
        ["EXPIRE", key, "86400"],
      ]);
    } catch (err) {
      console.warn("[tavily-budget] Upstash increment error:", err instanceof Error ? err.message : err);
      memoryBudgetStore.set(key, (memoryBudgetStore.get(key) ?? 0) + 1);
    }
    return;
  }

  memoryBudgetStore.set(key, (memoryBudgetStore.get(key) ?? 0) + 1);
}

// ─── Helpers ───

function truncateSnippet(text: string): string {
  if (text.length <= MAX_SNIPPET_LENGTH) return text;
  return text.substring(0, MAX_SNIPPET_LENGTH) + "…";
}

/**
 * Extract English tokens from a text blob.
 * Returns lowercased, deduplicated words (length >= 2, not in common stopwords).
 */
function extractEnglishTokens(...texts: string[]): string[] {
  const stopwords = new Set([
    "is","an","to","in","of","for","the","and","or","on","at","by","be",
    "it","as","no","my","me","we","us","so","up","do","if","he","she",
  ]);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const text of texts) {
    const matches = text.match(/[a-zA-Z][a-zA-Z0-9]{1,}/g);
    if (!matches) continue;
    for (const raw of matches) {
      const w = raw.toLowerCase();
      if (stopwords.has(w) || w.length < 2 || seen.has(w)) continue;
      seen.add(w);
      result.push(w);
      if (result.length >= 8) break;
    }
    if (result.length >= 8) break;
  }
  return result;
}

function generateQueries(input: IdeaInput): string[] {
  const terms = extractEnglishTokens(
    input.idea, input.targetUser, input.problem,
    input.pricing, input.firstVersion, input.buildTime
  );

  const trunc = (a: string[], n: number) => a.slice(0, n).join(" ");

  if (terms.length >= 3) {
    // 3 distinct English queries from user's own terms
    return [
      trunc(terms, 5) + " market trends 2026",
      trunc(terms, 4) + " competitors alternatives",
      trunc(terms, 5) + " pricing business model",
    ];
  }

  if (terms.length >= 1) {
    const base = trunc(terms, 5);
    return [
      base + " market",
      base + " competitors",
      base + " pricing",
    ];
  }

  // Pure-Chinese input, no English tokens found.
  // Use short generic English queries. These are broad but valid.
  return [
    "startup market trends 2026",
    "consumer behavior small business",
    "new business pricing strategy",
  ];
}

async function singleSearch(query: string, apiKey: string): Promise<TavilySearchResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: MAX_RESULTS_PER_SEARCH,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
          return [];
    }

    const data: TavilyApiResponse = await response.json();
    return (data.results || [])
      .slice(0, MAX_RESULTS_PER_SEARCH)
      .filter((r) => r.title || r.content)
      .map((r) => ({
        title: (r.title || "").trim(),
        url: (r.url || "").trim(),
        snippet: truncateSnippet(r.content || ""),
      }))
      .filter((r) => r.title.length > 0);
  } catch (e) {
    console.warn("[search-support] Tavily search failed:", e instanceof Error ? e.message : "unknown error");
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public API ───

/**
 * Perform Tavily basic searches for a given idea input.
 *
 * - Generates up to 3 search queries based on the idea
 * - Max 3 results per search
 * - 5-second timeout per individual search
 * - 15-second total timeout for the entire search phase
 * - Never throws: returns empty results on any failure
 * - Snippet truncated to 200 characters
 *
 * Results are used only as internal auxiliary context for the LLM prompt;
 * never displayed to the user.
 */
export async function searchMarketContext(input: IdeaInput, maxQueries: number = MAX_SEARCHES): Promise<SearchContext> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { results: [], succeeded: false };

  // No TAVILY_API_KEY in mock/sandbox env — skip silently
  if (apiKey === "YOUR_TAVILY_API_KEY_HERE") return { results: [], succeeded: false };

  // ??? Daily budget guard ???
  const budget = await checkTavilyBudget();
  if (!budget.allowed) {
    console.warn("[tavily-budget] daily limit reached \u2014 skipping Tavily for this analysis");
    return { results: [], succeeded: false };
  }
  const queries = generateQueries(input).slice(0, maxQueries);
  const allResults: TavilySearchResult[] = [];
  const totalStart = Date.now();

  for (const query of queries) {
    if (allResults.length >= MAX_SEARCHES * MAX_RESULTS_PER_SEARCH) break;
    if (Date.now() - totalStart >= TOTAL_TIMEOUT_MS) break;

    await incrementTavilyUsage();
    const results = await singleSearch(query, apiKey);
    allResults.push(...results);
  }

  return {
    results: allResults,
    succeeded: allResults.length > 0,
  };
}

/**
 * Format search results into a text block for LLM prompt injection.
 * Returns empty string when there are no results.
 */
export function formatSearchContext(results: TavilySearchResult[]): string {
  if (results.length === 0) return "";

  const lines = results.map(
    (r, i) =>
      `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    摘要：${r.snippet}`
  );

  return `以下為外部搜尋取得的市場參考資料（僅供參考，非全面市場調查）：\n\n${lines.join("\n\n")}`;
}

