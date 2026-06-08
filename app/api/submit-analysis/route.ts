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
  remainingAttempts?: number;
  analysisResult?: AnalysisResult | null;
}

function buildRes(
  a: Analysis,
  paymentUsed: boolean,
  remainingAttempts?: number,
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
    remainingAttempts,
    analysisResult: analysisResult ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentId, analysisId, idea, targetUser, problem, pricing, firstVersion, buildTime } = body as {
      paymentId: string;
      analysisId: string;
    } & IdeaInput;

    if (!paymentId) return Response.json({ error: "缺少付款編號。" }, { status: 400 });
    if (!analysisId) return Response.json({ error: "缺少分析編號。" }, { status: 400 });
    if (!idea?.trim() || !targetUser?.trim() || !problem?.trim() || !pricing?.trim() || !firstVersion?.trim() || !buildTime?.trim()) {
      return Response.json({ error: "請填寫所有欄位。" }, { status: 400 });
    }

    // Validate payment
    const payment = await recordStore.getPayment(paymentId);
    if (!payment) return Response.json({ error: "付款不存在。" }, { status: 404 });
    if (payment.status !== "paid") return Response.json({ error: "此付款尚未完成確認，請先完成付款。" }, { status: 400 });

    const inputs: Analysis["inputs"] = { idea, targetUser, problem, pricing, firstVersion, buildTime };
    const combinedText = `${idea} ${targetUser} ${problem} ${pricing} ${firstVersion} ${buildTime}`;
    const inputObj: IdeaInput = { idea, targetUser, problem, pricing, firstVersion, buildTime };

    // Validate analysis
    const analysis = await recordStore.getAnalysis(analysisId);
    if (!analysis) return Response.json({ error: "分析不存在。" }, { status: 404 });
    if (analysis.paymentId !== paymentId) return Response.json({ error: "分析與付款不符。" }, { status: 400 });

    // ─── Attempt limit checks (before any AI call) ───
    // ─── Duplicate submission checks (before any AI call) ───
    if (analysis.used || (analysis.hasSignal && analysis.status === "completed")) {
      return Response.json({
        status: "duplicate_submission",
        message: "本次付款已送出判定，請勿重複提交。",
      }, { status: 409 });
    }

    if (analysis.status === "submitted" && analysis.completedAt === null) {
      return Response.json({
        status: "duplicate_submission",
        message: "本次判定正在處理中，請勿重複提交。",
      }, { status: 409 });
    }

    if (analysis.attemptCount >= analysis.maxAttempts) {
      // Record exhausted state
      await recordStore.updateAnalysis(analysisId, {
        status: "attempts_exhausted" as Analysis["status"],
        hasSignal: false, used: false,
        completedAt: new Date().toISOString(),
        errorReason: "已達判定次數上限",
      });
      const updated = await recordStore.getAnalysis(analysisId);
      return Response.json(buildRes(updated!, false, 0));
    }

    // Update placeholder Submission with real inputs
    await recordStore.updateAnalysisInputs(analysisId, inputs);

    // ─── Increment attempt count BEFORE validation / AI call ───
    const newAttemptCount = analysis.attemptCount + 1;
    await recordStore.updateAnalysis(analysisId, { attemptCount: newAttemptCount, status: "submitted" });
    const attemptAnalysis = await recordStore.getAnalysis(analysisId);
    const remainingAttempts = attemptAnalysis!.maxAttempts - attemptAnalysis!.attemptCount;

    // ─── Helper: rejection (payment NOT used, attempt counted) ───
    async function reject(status: Analysis["status"], reason: string, aiRaw?: string) {
      const u = await recordStore.updateAnalysis(analysis!.id, { status, hasSignal: false, completedAt: new Date().toISOString(), errorReason: reason, aiRawResponse: aiRaw ?? null, used: false });
      return Response.json(buildRes(u!, false, remainingAttempts));
    }

    // ─── Helper: system error (payment NOT used, attempt counted) ───
    async function sysErr(reason: string, aiRaw?: string | null) {
      // Rollback attempt count — system errors should not consume revision attempts
      const u = await recordStore.updateAnalysis(analysis!.id, {
        attemptCount: analysis!.attemptCount,
        status: "failed_system_error", hasSignal: false,
        completedAt: new Date().toISOString(),
        errorReason: reason,
        aiRawResponse: aiRaw ?? null, used: false,
      });
      // Recalculate remaining attempts after rollback
      const updatedAnalysis = await recordStore.getAnalysis(analysis!.id);
      const remaining = updatedAnalysis ? updatedAnalysis.maxAttempts - updatedAnalysis.attemptCount : remainingAttempts;
      return Response.json(buildRes(updatedAnalysis!, false, remaining));
    }
    // 1. Illegal / grey-area
    if (isIllegalIdea(combinedText)) return reject("needs_revision", "這個點子涉及不支援的內容，無法判定。");

    // 2. Idea relevance
    if (!isIdeaRelevant(combinedText)) return reject("needs_revision", "這個輸入不像商業點子，無法判定。");

    // 3. Low information
    if (hasLowInformation(inputObj)) return reject("needs_revision", "你填寫的內容資訊不足，請補充收費方式、第一版做法與完成時間。");

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
    const rawText = await analyzeRes.text();
    try { analyzeData = JSON.parse(rawText); } catch { console.error('[submit-analysis] analyze-idea response not parseable as JSON — status=' + analyzeRes.status + ' statusText=' + analyzeRes.statusText + ' contentType=' + (analyzeRes.headers.get('content-type') || 'none') + ' bodyStart=' + rawText.substring(0, 2000)); return sysErr('系統回傳內容無法解析。'); }

    const d = analyzeData as Record<string, unknown>;

    // 4a. 400 = rejection by analyze-idea (payment NOT used, attempt counted)
    if (analyzeRes.status === 400) {
      const code = d?.error as string;
      const msg = (d?.message as string) || code || "無法判定";
      if (code === "UNSUPPORTED_IDEA") return reject("needs_revision", msg, JSON.stringify(analyzeData));
      if (code === "INVALID_IDEA") return reject("needs_revision", msg, JSON.stringify(analyzeData));
      return reject("needs_revision", msg, JSON.stringify(analyzeData));
    }

    // 4b. 502/500 = system error (payment NOT used, attempt counted)
    if (!analyzeRes.ok) return sysErr((d?.error as string) || "AI 判定服務暫時無法使用", JSON.stringify(analyzeData));

    // 5. Success: used = true, hasSignal = true
    const light = d?.light as string;
    if (light && ["red", "yellow", "green"].includes(light)) {
      await recordStore.usePayment(paymentId);
      const u = await recordStore.updateAnalysis(analysis!.id, { status: "completed", signal: light as "red" | "yellow" | "green", hasSignal: true, used: true, completedAt: new Date().toISOString(), aiRawResponse: JSON.stringify(analyzeData), errorReason: null });
      return Response.json({ ...buildRes(u!, true, remainingAttempts), analysisResult: analyzeData as AnalysisResult });
    }

    // Valid HTTP 200 but no light → system error
    return sysErr("系統回傳格式異常，無法取得判燈結果。", JSON.stringify(analyzeData));
  } catch (err) {
    console.error("[submit-analysis] Unexpected:", err);
    return Response.json({ error: "伺服器發生錯誤，請稍後再試。" }, { status: 500 });
  }
}
