import { recordStore } from "@/lib/record-store";
import type { Analysis } from "@/lib/types";
import type { IdeaInput, AnalysisResult } from "@/app/api/analyze-idea/route";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isIdeaRelevant, isIllegalIdea, hasLowInformation } from "@/lib/idea-validation";
import { FIRST_REPORT_PRICE_TWD } from "@/lib/pricing";

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

// ─── Helpers ───

/**
 * Validate payment existence and status. Returns a Response on failure, null on success.
 */
async function validatePayment(paymentId: string): Promise<Response | null> {
  const payment = await recordStore.getPayment(paymentId);
  if (!payment) return Response.json({ error: "付款不存在。" }, { status: 404 });
  if (payment.status !== "paid") return Response.json({ error: "此付款尚未完成確認，請先完成付款。" }, { status: 400 });
  return null;
}

/**
 * Check duplicate submission and attempt limits. Returns a Response on failure, null on success.
 */
async function checkDuplicateOrExhausted(analysisId: string, analysis: Analysis): Promise<Response | null> {
  if (analysis.used || (analysis.hasSignal && analysis.status === "completed")) {
    return Response.json({
      status: "duplicate_submission",
      message: "本次付款已送出判定，請勿重複提交。"
    }, { status: 409 });
  }

  if (analysis.status === "submitted" && analysis.completedAt === null) {
    return Response.json({
      status: "duplicate_submission",
      message: "本次判定正在處理中，請勿重複提交。"
    }, { status: 409 });
  }

  if (analysis.attemptCount >= analysis.maxAttempts) {
    await recordStore.updateAnalysis(analysisId, {
      status: "attempts_exhausted" as Analysis["status"],
      hasSignal: false, used: false,
      completedAt: new Date().toISOString(),
      errorReason: "已達判定次數上限"
    });
    const updated = await recordStore.getAnalysis(analysisId);
    return Response.json(buildRes(updated!, false, 0));
  }

  return null;
}
/**
 * Call /api/analyze-idea and return a structured result.
 * Handles fetch, timeout, JSON parsing, and status-code classification.
 * Never throws: returns a discriminated result object on any outcome.
 */
type AnalyzeIdeaResult =
  | { kind: "success"; data: Record<string, unknown>; rawData: unknown }
  | { kind: "needs_revision"; message: string; rawData: unknown }
  | { kind: "system_error"; message: string; rawData?: unknown }
  | { kind: "fetch_error"; message: string };

async function callAnalyzeIdea(
  inputs: Analysis["inputs"],
  requestUrl: string
): Promise<AnalyzeIdeaResult> {
  let analyzeRes: Response;
  try {
    const url = new URL(requestUrl);
    const baseUrl = `${url.protocol}//${url.host}`;
    analyzeRes = await fetch(`${baseUrl}/api/analyze-idea`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_API_SECRET || "" },
      signal: AbortSignal.timeout(65000),
      body: JSON.stringify(inputs),
    });
  } catch (fetchErr) {
    const reason = fetchErr instanceof Error ? fetchErr.message : "無法連接到分析服務";
    return { kind: "fetch_error", message: reason };
  }

  let analyzeData: unknown;
  const rawText = await analyzeRes.text();
  try {
    analyzeData = JSON.parse(rawText);
  } catch {
    console.error('[submit-analysis] analyze-idea response not parseable as JSON — status=' + analyzeRes.status + ' statusText=' + analyzeRes.statusText + ' contentType=' + (analyzeRes.headers.get('content-type') || 'none') + ' bodyStart=' + rawText.substring(0, 2000));
    return { kind: "system_error", message: "系統回傳內容無法解析。" };
  }

  const d = analyzeData as Record<string, unknown>;

  // 400 = rejection (not a business idea, illegal, or low-information)
  if (analyzeRes.status === 400) {
    const code = d?.error as string;
    const msg = (d?.message as string) || code || "無法判定";
    return { kind: "needs_revision", message: msg, rawData: analyzeData };
  }

  // 502/500 = upstream AI service error
  if (!analyzeRes.ok) {
    return { kind: "system_error", message: (d?.error as string) || "AI 判定服務暫時無法使用", rawData: analyzeData };
  }

  // 200 = success (may or may not have a valid light)
  return { kind: "success", data: d, rawData: analyzeData };
}

// ─── Helper: rejection (payment NOT used, attempt counted) ───
async function reject(
  analysis: Analysis,
  remainingAttempts: number,
  status: Analysis["status"],
  reason: string,
  aiRaw?: string
): Promise<Response> {
  const u = await recordStore.updateAnalysis(analysis.id, { status, hasSignal: false, completedAt: new Date().toISOString(), errorReason: reason, aiRawResponse: aiRaw ?? null, used: false });
  return Response.json(buildRes(u!, false, remainingAttempts));
}

// ─── Helper: system error (payment NOT used, attempt counted) ───
async function sysErr(
  analysis: Analysis,
  remainingAttempts: number,
  reason: string,
  aiRaw?: string | null
): Promise<Response> {
  // Rollback attempt count — system errors should not consume revision attempts
  const u = await recordStore.updateAnalysis(analysis.id, {
    attemptCount: analysis.attemptCount,
    status: "failed_system_error", hasSignal: false,
    completedAt: new Date().toISOString(),
    errorReason: reason,
    aiRawResponse: aiRaw ?? null, used: false,
  });
  // Recalculate remaining attempts after rollback
  const updatedAnalysis = await recordStore.getAnalysis(analysis.id);
  const remaining = updatedAnalysis ? updatedAnalysis.maxAttempts - updatedAnalysis.attemptCount : remainingAttempts;
  return Response.json(buildRes(updatedAnalysis!, false, remaining));
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = await checkRateLimit(ip, 10, 10 * 60 * 1000);
    if (!limit.allowed) {
      return Response.json(
        { error: "rate_limited", message: "請稍後再試。" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    }
    const body = await request.json();
    let { paymentId, analysisId, idea, targetUser, problem, pricing, firstVersion, buildTime } = body as {
      paymentId: string;
      analysisId: string;
    } & IdeaInput;

    if (!idea?.trim() || !targetUser?.trim() || !problem?.trim() || !pricing?.trim() || !firstVersion?.trim() || !buildTime?.trim()) {
      return Response.json({ error: "請填寫所有欄位。" }, { status: 400 });
    }

    // ─── Public Beta: auto-create free payment + analysis when not provided ───
    let isBetaMode = false;
    if (process.env.PUBLIC_BETA === "true" && !paymentId) {
      isBetaMode = true;
      const { payment, analysis } = await recordStore.createPayment(0, {
        providerName: "beta_free",
      });
      await recordStore.confirmPayment(payment.id);
      paymentId = payment.id;
      analysisId = analysis.id;
    }

    if (!paymentId) return Response.json({ error: "缺少付款編號。" }, { status: 400 });
    if (!analysisId) return Response.json({ error: "缺少分析編號。" }, { status: 400 });

    // Validate payment (skipped in beta mode — auto-created and auto-confirmed above)
    if (!isBetaMode) {
      const paymentErr = await validatePayment(paymentId);
      if (paymentErr) return paymentErr;
    }    const inputs: Analysis["inputs"] = { idea, targetUser, problem, pricing, firstVersion, buildTime };
    const combinedText = `${idea} ${targetUser} ${problem} ${pricing} ${firstVersion} ${buildTime}`;
    const inputObj: IdeaInput = { idea, targetUser, problem, pricing, firstVersion, buildTime };

    // Validate analysis
    const analysis = await recordStore.getAnalysis(analysisId);
    if (!analysis) return Response.json({ error: "分析不存在。" }, { status: 404 });
    if (analysis.paymentId !== paymentId) return Response.json({ error: "分析與付款不符。" }, { status: 400 });

    // ─── Duplicate / attempt limit checks (before any AI call) ───
    const dupErr = await checkDuplicateOrExhausted(analysisId, analysis);
    if (dupErr) return dupErr;

    // Update placeholder Submission with real inputs
    await recordStore.updateAnalysisInputs(analysisId, inputs);


    // ─── Atomically claim this analysis for processing ───
    // Prevents race conditions: only one request can transition
    // from an inactive status (pending/needs_revision/failed_system_error)
    // to "submitted" at a time.
    const newAttemptCount = analysis.attemptCount + 1;
    const claimed = await recordStore.tryClaimAnalysis(
      analysisId,
      ["pending", "needs_revision", "failed_system_error"],
      newAttemptCount
    );
    if (!claimed) {
      return Response.json({
        status: "duplicate_submission",
        message: "本次判定正在處理中，請勿重複提交。",
      }, { status: 409 });
    }
    // Reload to get updated attemptCount for remaining calculation
    const attemptAnalysis = await recordStore.getAnalysis(analysisId);
    const remainingAttempts = attemptAnalysis!.maxAttempts - attemptAnalysis!.attemptCount;


    
    // 1. Illegal / grey-area
    if (isIllegalIdea(combinedText)) return reject(analysis, remainingAttempts, "needs_revision", "這個點子涉及不支援的內容，無法判定。");

    // 2. Idea relevance
    if (!isIdeaRelevant(combinedText)) return reject(analysis, remainingAttempts, "needs_revision", "這個輸入不像商業點子，無法判定。");

    // 3. Low information
    if (hasLowInformation(inputObj)) return reject(analysis, remainingAttempts, "needs_revision", "你填寫的內容資訊不足，請補充收費方式、第一版做法與完成時間。");

    // 4. Call analyze-idea and process result
    const analysisResult = await callAnalyzeIdea(inputs, request.url);

    switch (analysisResult.kind) {
      case "fetch_error":
        return sysErr(analysis, remainingAttempts, `系統錯誤：${analysisResult.message}`);

      case "needs_revision":
        return reject(analysis, remainingAttempts, "needs_revision", analysisResult.message, JSON.stringify(analysisResult.rawData));

      case "system_error":
        return sysErr(analysis, remainingAttempts, analysisResult.message, analysisResult.rawData ? JSON.stringify(analysisResult.rawData) : undefined);

      case "success": {
        const light = analysisResult.data.light as string;
        if (light && ["red", "yellow", "green"].includes(light)) {
          await recordStore.usePayment(paymentId);
          const u = await recordStore.updateAnalysis(analysis!.id, { status: "completed", signal: light as "red" | "yellow" | "green", hasSignal: true, used: true, completedAt: new Date().toISOString(), aiRawResponse: JSON.stringify(analysisResult.rawData), errorReason: null });
          return Response.json({ ...buildRes(u!, true, remainingAttempts), analysisResult: analysisResult.rawData as AnalysisResult });
        }

        // Valid HTTP 200 but no light → system error
        return sysErr(analysis, remainingAttempts, "系統回傳格式異常，無法取得判燈結果。", JSON.stringify(analysisResult.rawData));
      }
    }
  } catch (err) {
    console.error("[submit-analysis] Unexpected:", err);
    return Response.json({ error: "伺服器發生錯誤，請稍後再試。" }, { status: 500 });
  }
}