// ─── Business Idea Validation ───
// Shared validation logic used by both submit-analysis and analyze-idea routes.

export const NON_BIZ_KEYWORDS_EN = [
  "pi", "weather", "stock", "bitcoin", "crypto", "news",
  "translate", "homework", "essay", "joke", "chat",
  "love letter", "math", "equation",
];

export const ILLEGAL_KEYWORDS = [
  "piracy", "crack", "hack", "fake brand", "counterfeit",
  "gambling", "porn", "scam", "phishing", "stolen data",
  "fake reviews", "bot followers",
];

const MEANINGLESS_PATTERNS = [/^test$/i, /^測試$/, /^123$/, /^1+$/, /^哈哈$/, /^隨便$/, /^不知道$/, /^asdf$/i, /^\?+$/];

/**
 * Check if the input looks like a business idea (not a generic query).
 */
export function isIdeaRelevant(text: string): boolean {
  if (text.length < 6) return false;
  if (/^(?:幫我|請你|可以幫我|告訴我|請|帮我|请|请告诉我|tell me|help me|can you)/i.test(text)) return false;
  const first100 = text.substring(0, 100);
  return !NON_BIZ_KEYWORDS_EN.some((kw) => first100.includes(kw));
}

/**
 * Check if the idea involves illegal or grey-area content.
 */
export function isIllegalIdea(text: string): boolean {
  return ILLEGAL_KEYWORDS.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));
}

/**
 * Check if the combined input has too little useful information
 * (filler, spam, or near-empty fields).
 */
export function hasLowInformation(input: {
  idea: string; targetUser: string; problem: string;
  pricing: string; firstVersion: string; buildTime: string;
}): boolean {
  const fields = [input.idea, input.targetUser, input.problem, input.pricing, input.firstVersion, input.buildTime];
  const t = fields.map(f => (f || "").trim());
  const last3 = [input.pricing, input.firstVersion, input.buildTime].map(f => (f || "").trim());
  if (t.filter(f => f.length >= 1 && f.length <= 2).length >= 5) return true;
  if (t.filter(f => f.length > 0 && /^\d+$/.test(f)).length >= 4) return true;
  const nonEmpty = t.filter(f => f.length > 0);
  if (nonEmpty.length >= 4 && new Set(nonEmpty).size === 1) return true;
  if (t.filter(f => MEANINGLESS_PATTERNS.some(p => p.test(f))).length >= 4) return true;
  if (t.reduce((s, f) => s + f.length, 0) < 12) return true;
  if (last3.every(f => f.length >= 1 && f.length <= 2)) return true;
  const _isLowLast = (s: string) => s.length > 0 && (/^\d+$/.test(s) || (s.length >= 2 && [...s].every(c => c === s[0])));
  if (last3.filter(_isLowLast).length >= 2) return true;
  return false;
}
