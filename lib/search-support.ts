import type { IdeaInput } from "@/app/api/analyze-idea/route";

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

// ─── Helpers ───

function truncateSnippet(text: string): string {
  if (text.length <= MAX_SNIPPET_LENGTH) return text;
  return text.substring(0, MAX_SNIPPET_LENGTH) + "…";
}

function generateQueries(input: IdeaInput): string[] {
  const queries: string[] = [];

  // Query 1: Market trends for the idea
  queries.push(`${input.idea} market trends`);

  // Query 2: Competitors / alternatives related to target and problem
  queries.push(`${input.targetUser} ${input.problem} alternatives`);

  // Query 3: Pricing / business model
  queries.push(`${input.idea} pricing business model`);

  return queries;
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

    if (!response.ok) return [];

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
  } catch {
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
export async function searchMarketContext(input: IdeaInput): Promise<SearchContext> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { results: [], succeeded: false };

  // No TAVILY_API_KEY in mock/sandbox env — skip silently
  if (apiKey === "YOUR_TAVILY_API_KEY_HERE") return { results: [], succeeded: false };

  const queries = generateQueries(input);
  const allResults: TavilySearchResult[] = [];
  const totalStart = Date.now();

  for (const query of queries) {
    if (allResults.length >= MAX_SEARCHES * MAX_RESULTS_PER_SEARCH) break;
    if (Date.now() - totalStart >= TOTAL_TIMEOUT_MS) break;

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
