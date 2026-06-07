import { recordStore } from "@/lib/record-store";
import type { Analysis } from "@/lib/types";
import type { IdeaInput, AnalysisResult } from "@/app/api/analyze-idea/route";

// ─── Validation helpers ───
const NON_BIZ_KEYWORDS_EN = [
  "pi", "weather", "stock", "bitcoin", "crypto", "news",
  "translate", "homework", "essay", "joke", "chat",
  "love letter", "math", "equation",
];
const ILLEGAL_KEYWORDS = [
  "piracy", "crack", "hack", "fake brand", "counterfeit",
  "gambling", "porn", "scam", "phishing", "stolen data",
  "fake reviews", "bot followers",
];

function isIdeaRelevant(text: string): boolean {
  if (text.length < 6) return false;
  if (/^(?:幫我|請你|可以幫我|告訴我|請|帮我|请|请告诉我|tell me|help me|can you)/i.test(text)) return false;
  const first100 = text.substring(0, 100);
  return !NON_BIZ_KEYWORDS_EN.some((kw) => first100.includes(kw));
}
function isIllegalIdea(text: string): boolean {
  return ILLEGAL_KEYWORDS.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));
}
const MEANINGLESS_PATTERNS = [/^test$/i, /^測試$/, /^123$/, /^1+$/, /^哈哈$/, /^隨便$/, /^不知道$/, /^asdf$/i, /^\?+$/];
function hasLowInformation(input: IdeaInput): boolean {
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

// ─── Shared response type ───
export interface SubmitAnalysisResponse {
  analysisId: string;
  paymentId: string;
  paymentUsed: boolean;
  status: Analysis["status"];
  hasSignal: boolean;
  signal: Analysis["signal"];
  createdAt: string;
  completedAt: string | null;
  errorReason: string | null;
  analysisResult?: AnalysisResult | null;
}

function buildRes(
  a: Analysis,
  paymentUsed: boolean,
  analysisResult?: AnalysisResult | null
): SubmitAnalysisResponse {
  return {
    analysisId: a.id,
    paymentId: a.paymentId,
    paymentUsed,
    status: a.status,
    hasSignal: a.hasSignal,
    signal: a.signal,
    createdAt: a.createdAt,
    completedAt: a.completedAt,
    errorReason: a.errorReason,
    analysisResult: analysisResult ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentId, idea, targetUser, problem, pricing, firstVersion, buildTime } = body as {
      paymentId: string;
    } & IdeaInput;

    if (!paymentId) return Response.json({ error: "缺少付款編號。" }, { status: 400 });
    if (!idea?.trim() || !targetUser?.trim() || !problem?.trim() || !pricing?.trim() || !firstVersion?.trim() || !buildTime?.trim()) {
      return Response.json({ error: "請填寫所有欄位。" }, { status: 400 });
    }

    // Validate payment
    const payment = await recordStore.getPayment(paymentId);
    if (!payment) return Response.json({ error: "付款不存在。" }, { status: 404 });
    if (payment.used) return Response.json({ error: "此付款已使用過。" }, { status: 400 });

    const inputs: Analysis["inputs"] = { idea, targetUser, problem, pricing, firstVersion, buildTime };
    const combinedText = `${idea} ${targetUser} ${problem} ${pricing} ${firstVersion} ${buildTime}`;
    const inputObj: IdeaInput = { idea, targetUser, problem, pricing, firstVersion, buildTime };

    // Create analysis record
    const analysis = await recordStore.createAnalysis({ paymentId, inputs });

    // ─── Helper: rejection (payment used) ───
    async function reject(status: Analysis["status"], reason: string, aiRaw?: string) {
      await recordStore.usePayment(paymentId);
      const u = await recordStore.updateAnalysis(analysis.id, { status, hasSignal: false, completedAt: new Date().toISOString(), errorReason: reason, aiRawResponse: aiRaw ?? null });
      return Response.json(buildRes(u!, true));
    }

    // ─── Helper: system error (payment NOT used) ───
    async function sysErr(reason: string, aiRaw?: string | null) {
      const u = await recordStore.updateAnalysis(analysis.id, { status: "failed_system_error", hasSignal: false, completedAt: new Date().toISOString(), errorReason: reason, aiRawResponse: aiRaw ?? null });
      return Response.json(buildRes(u!, false));
    }

    // 1. Illegal / grey-area
    if (isIllegalIdea(combinedText)) return reject("rejected_unsupported", "這個點子涉及不支援的內容，無法判定。");

    // 2. Idea relevance
    if (!isIdeaRelevant(combinedText)) return reject("rejected_invalid_idea", "這個輸入不像商業點子，無法判定。");

    // 3. Low information
    if (hasLowInformation(inputObj)) return reject("rejected_low_information", "你填寫的內容資訊不足，請補充收費方式、第一版做法與完成時間。");

    // 4. Call analyze-idea internally
    let analyzeRes: Response;
    try {
      const url = new URL(request.url);
      const baseUrl = `${url.protocol}//${url.host}`;
      analyzeRes = await fetch(`${baseUrl}/api/analyze-idea`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(65000),
        body: JSON.stringify(inputs),
      });
    } catch (fetchErr) {
      const reason = fetchErr instanceof Error ? fetchErr.message : "無法連接到分析服務";
      return sysErr(`系統錯誤：${reason}`);
    }

    let analyzeData: unknown;
    try { analyzeData = await analyzeRes.json(); } catch { return sysErr("系統回傳內容無法解析。"); }

    const d = analyzeData as Record<string, unknown>;

    // 4a. 400 = rejection by analyze-idea (payment used)
    if (analyzeRes.status === 400) {
      const code = d?.error as string;
      const msg = (d?.message as string) || code || "無法判定";
      if (code === "UNSUPPORTED_IDEA") return reject("rejected_unsupported", msg, JSON.stringify(analyzeData));
      if (code === "INVALID_IDEA") return reject(msg.includes("資訊不足") ? "rejected_low_information" : "rejected_invalid_idea", msg, JSON.stringify(analyzeData));
      return reject("rejected_invalid_idea", msg, JSON.stringify(analyzeData));
    }

    // 4b. 502/500 = system error (payment NOT used)
    if (!analyzeRes.ok) return sysErr((d?.error as string) || "AI 判定服務暫時無法使用", JSON.stringify(analyzeData));

    // 5. Success
    const light = d?.light as string;
    if (light && ["red", "yellow", "green"].includes(light)) {
      await recordStore.usePayment(paymentId);
      const u = await recordStore.updateAnalysis(analysis.id, { status: "completed", signal: light as "red" | "yellow" | "green", hasSignal: true, used: true, completedAt: new Date().toISOString(), aiRawResponse: JSON.stringify(analyzeData), errorReason: null });
      return Response.json({ ...buildRes(u!, true), analysisResult: analyzeData as AnalysisResult });
    }

    // Valid HTTP 200 but no light → system error
    return sysErr("系統回傳格式異常，無法取得判燈結果。", JSON.stringify(analyzeData));
  } catch (err) {
    console.error("[submit-analysis] Unexpected:", err);
    return Response.json({ error: "伺服器發生錯誤，請稍後再試。" }, { status: 500 });
  }
}
