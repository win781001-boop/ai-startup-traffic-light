import { prisma } from "./prisma";
import type { Payment, Analysis, Feedback, PaymentWebhookLog, CreatePaymentWebhookLogInput } from "./types";
import { FIRST_REPORT_PRICE_TWD } from "./pricing";

function genId(prefix: string): string {
  const n = Date.now();
  const r = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${n.toString(36)}-${r}`;
}

// ─── Mapping helpers ───

/** Convert Prisma Payment row to application Payment type. */
function toPayment(p: {
  id: string;
  status: string;
  used: boolean;
  usedAt: Date | null;
  createdAt: Date;
  paidAt: Date | null;
  amountTwd: number;
  providerName: string;
  providerPaymentId: string | null;
  providerRawResponse: string | null;
}): Payment {
  return {
    id: p.id, status: p.status as Payment["status"], used: p.used,
    usedAt: p.usedAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString(),
    paidAt: p.paidAt?.toISOString() ?? null,
    amountTwd: p.amountTwd,
    providerName: p.providerName,
    providerPaymentId: p.providerPaymentId ?? null,
    providerRawResponse: p.providerRawResponse ?? null,
  };
}

/** Convert Prisma Analysis row (with submission relation) to application Analysis type. */
function toAnalysis(a: {
  id: string;
  paymentId: string;
  used: boolean;
  status: string;
  signal: string | null;
  hasSignal: boolean;
  attemptCount: number;
  maxAttempts: number;
  aiRawResponse: string | null;
  errorReason: string | null;
  createdAt: Date;
  completedAt: Date | null;
}, inputs: Analysis["inputs"]): Analysis {
  return {
    id: a.id, paymentId: a.paymentId,
    inputs,
    used: a.used, status: a.status as Analysis["status"],
    signal: a.signal as Analysis["signal"], hasSignal: a.hasSignal,
    attemptCount: a.attemptCount, maxAttempts: a.maxAttempts,
    aiRawResponse: a.aiRawResponse, errorReason: a.errorReason,
    createdAt: a.createdAt.toISOString(), completedAt: a.completedAt?.toISOString() ?? null,
  };
}

/** Convert Prisma PaymentWebhookLog row to application PaymentWebhookLog type. */
function toPaymentWebhookLog(l: {
  id: string;
  paymentId: string | null;
  providerName: string;
  providerEventId: string | null;
  providerPaymentId: string | null;
  dedupeKey: string;
  eventType: string;
  rawPayload: string;
  verified: boolean;
  verifiedAt: Date | null;
  signatureValid: boolean | null;
  amountMatch: boolean | null;
  processed: boolean;
  processedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}): PaymentWebhookLog {
  return {
    id: l.id,
    paymentId: l.paymentId,
    providerName: l.providerName,
    providerEventId: l.providerEventId,
    providerPaymentId: l.providerPaymentId,
    dedupeKey: l.dedupeKey,
    eventType: l.eventType,
    rawPayload: l.rawPayload,
    verified: l.verified,
    verifiedAt: l.verifiedAt?.toISOString() ?? null,
    signatureValid: l.signatureValid,
    amountMatch: l.amountMatch,
    processed: l.processed,
    processedAt: l.processedAt?.toISOString() ?? null,
    errorMessage: l.errorMessage,
    createdAt: l.createdAt.toISOString(),
  };
}

export const recordStore = {
  async createPayment(amountTwd: number = FIRST_REPORT_PRICE_TWD): Promise<{ payment: Payment; analysis: Analysis }> {
    const paymentId = genId("pay");
    const analysisId = genId("ana");
    const submissionId = genId("sub");
    const now = new Date();

    // Sequential creates: avoids prisma.$transaction timeout with Neon WebSocket adapter.
    // These three INSERTs are independent and do not need atomic wrapping.
    const p = await prisma.payment.create({
        data: { id: paymentId, status: "pending", used: false, usedAt: null, createdAt: now, paidAt: null, amountTwd, providerName: "mock", providerPaymentId: null, providerRawResponse: null },
      });
      await prisma.submission.create({
        data: { id: submissionId, paymentId, status: "pending", idea: "", targetUser: "", problem: "", pricing: "", firstVersion: "", buildTime: "", createdAt: now },
      });
      const a = await prisma.analysis.create({
        data: { id: analysisId, submissionId, paymentId, status: "pending", used: false, signal: null, hasSignal: false, aiRawResponse: null, errorReason: null, attemptCount: 0, maxAttempts: 3, createdAt: now, completedAt: null },
      });
      const result = { p, a };

    return {
      payment: toPayment(result.p),
      analysis: toAnalysis(result.a, { idea: "", targetUser: "", problem: "", pricing: "", firstVersion: "", buildTime: "" }),
    };
  },

  async confirmPayment(id: string): Promise<Payment | null> {
    const p = await prisma.payment.findUnique({ where: { id }, include: { analyses: true } });
    if (!p || p.status !== "pending") return null;
    const now = new Date();
    const updated = await prisma.payment.update({ where: { id }, data: { status: "paid", paidAt: now } });
    return toPayment(updated);
  },

  /**
   * Webhook 專用付款確認方法。
   * 僅在 payment 為 pending 狀態時更新為 paid，
   * 並同時寫入 webhook 提供的 providerName / providerPaymentId。
   * 不改既有 confirmPayment 行為。
   */
  async confirmPaymentByWebhook(paymentId: string, options: { providerPaymentId: string; providerName: string }): Promise<Payment | null> {
    const p = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!p || p.status !== "pending") return null;
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "paid", paidAt: new Date(), providerName: options.providerName, providerPaymentId: options.providerPaymentId },
    });
    return toPayment(updated);
  },

  async getPayment(id: string): Promise<Payment | null> {
    const p = await prisma.payment.findUnique({ where: { id } });
    if (!p) return null;
    return toPayment(p);
  },

  async usePayment(id: string): Promise<Payment | null> {
    const p = await prisma.payment.findUnique({ where: { id } });
    if (!p || p.used) return null;
    const updated = await prisma.payment.update({ where: { id }, data: { used: true, usedAt: new Date() } });
    return toPayment(updated);
  },

  async updateAnalysisInputs(analysisId: string, inputs: Analysis["inputs"]): Promise<Analysis> {
    const existing = await prisma.analysis.findUnique({ where: { id: analysisId }, include: { submission: true } });
    if (!existing) throw new Error("Analysis not found");
    await prisma.submission.update({
      where: { id: existing.submission.id },
      data: { idea: inputs.idea, targetUser: inputs.targetUser, problem: inputs.problem,
        pricing: inputs.pricing, firstVersion: inputs.firstVersion, buildTime: inputs.buildTime, status: "submitted" },
    });
    return toAnalysis(existing, inputs);
  },

  async updateAnalysis(id: string, updates: Partial<Pick<Analysis, "status" | "signal" | "hasSignal" | "aiRawResponse" | "errorReason" | "completedAt" | "used" | "attemptCount">>): Promise<Analysis | null> {
    const existing = await prisma.analysis.findUnique({ where: { id }, include: { submission: true } });
    if (!existing) return null;
    const data: Record<string, unknown> = {};
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.signal !== undefined) data.signal = updates.signal;
    if (updates.hasSignal !== undefined) data.hasSignal = updates.hasSignal;
    if (updates.aiRawResponse !== undefined) data.aiRawResponse = updates.aiRawResponse;
    if (updates.errorReason !== undefined) data.errorReason = updates.errorReason;
    if (updates.completedAt !== undefined) data.completedAt = updates.completedAt ? new Date(updates.completedAt) : null;
    if (updates.used !== undefined) data.used = updates.used;
    if (updates.attemptCount !== undefined) data.attemptCount = updates.attemptCount;
    const updated = await prisma.analysis.update({ where: { id }, data, include: { submission: true } });
    return toAnalysis(updated, {
      idea: updated.submission.idea, targetUser: updated.submission.targetUser,
      problem: updated.submission.problem, pricing: updated.submission.pricing,
      firstVersion: updated.submission.firstVersion, buildTime: updated.submission.buildTime,
    });
  },

  async getAnalysis(id: string): Promise<Analysis | null> {
    const a = await prisma.analysis.findUnique({ where: { id }, include: { submission: true } });
    if (!a) return null;
    return toAnalysis(a, {
      idea: a.submission.idea, targetUser: a.submission.targetUser,
      problem: a.submission.problem, pricing: a.submission.pricing,
      firstVersion: a.submission.firstVersion, buildTime: a.submission.buildTime,
    });
  },

  async getAnalysisByPaymentId(paymentId: string): Promise<Analysis | null> {
    const a = await prisma.analysis.findFirst({ where: { paymentId }, include: { submission: true } });
    if (!a) return null;
    return toAnalysis(a, {
      idea: a.submission.idea, targetUser: a.submission.targetUser,
      problem: a.submission.problem, pricing: a.submission.pricing,
      firstVersion: a.submission.firstVersion, buildTime: a.submission.buildTime,
    });
  },


  /**
   * Atomically claim an analysis for processing.
   * Only succeeds if the analysis is in one of the allowed statuses
   * (not already submitted/completed), preventing race conditions.
   */
  async tryClaimAnalysis(analysisId: string, expectedStatuses: string[], newAttemptCount: number): Promise<boolean> {
    const result = await prisma.analysis.updateMany({
      where: { id: analysisId, status: { in: expectedStatuses } },
      data: { status: "submitted", attemptCount: newAttemptCount },
    });
    return result.count > 0;
  },

  async saveFeedback(analysisId: string, paymentId: string, value: string): Promise<Feedback> {
    const feedback = await prisma.feedback.create({
      data: { analysisId, paymentId, value },
    });
    return {
      id: feedback.id,
      analysisId: feedback.analysisId,
      paymentId: feedback.paymentId,
      value: feedback.value as Feedback["value"],
      createdAt: feedback.createdAt.toISOString(),
    };
  },
  // ─── PaymentWebhookLog methods (Phase 3A) ───

  /**
   * 建立一筆 webhook 紀錄。
   * dedupeKey 為唯一鍵，相同 dedupeKey 重複呼叫會拋 Prisma unique constraint 錯誤。
   * 呼叫方應先透過 getPaymentWebhookLogByDedupeKey 檢查是否已存在。
   */
  async createPaymentWebhookLog(input: CreatePaymentWebhookLogInput): Promise<PaymentWebhookLog> {
    const log = await prisma.paymentWebhookLog.create({
      data: {
        paymentId: input.paymentId ?? null,
        providerName: input.providerName,
        providerEventId: input.providerEventId ?? null,
        providerPaymentId: input.providerPaymentId ?? null,
        dedupeKey: input.dedupeKey,
        eventType: input.eventType,
        rawPayload: input.rawPayload,
      },
    });
    return toPaymentWebhookLog(log);
  },

  /**
   * 以 dedupeKey 查詢是否已存在 webhook 紀錄。
   * 用於 webhook route 的 idempotency 檢查。
   */
  async getPaymentWebhookLogByDedupeKey(dedupeKey: string): Promise<PaymentWebhookLog | null> {
    const log = await prisma.paymentWebhookLog.findUnique({
      where: { dedupeKey },
    });
    if (!log) return null;
    return toPaymentWebhookLog(log);
  },

  /**
   * 標記 webhook 已處理完成。
   * 可選填 errorMessage，例如 `skip: duplicate` 或 `skip: already_processed`。
   */
  async markPaymentWebhookLogProcessed(id: string, options?: { errorMessage?: string | null }): Promise<PaymentWebhookLog | null> {
    const existing = await prisma.paymentWebhookLog.findUnique({ where: { id } });
    if (!existing) return null;
    const data: Record<string, unknown> = {
      processed: true,
      processedAt: new Date(),
    };
    if (options?.errorMessage !== undefined) data.errorMessage = options.errorMessage;
    const updated = await prisma.paymentWebhookLog.update({ where: { id }, data });
    return toPaymentWebhookLog(updated);
  },

  /**
   * 更新 webhook 的簽章驗證與金額核對結果。
   *
   * verified: 設定驗證結果（true = 驗證通過 / false = 驗證失敗）
   * signatureValid: 簽章是否有效（null = 尚未驗證）
   * amountMatch: 金額是否匹配（null = 尚未核對）
   *
   * 注意：amountMatch 不在 model 層計算，
   * 而是在未來 webhook route 內比對 rawPayload 中的金額與 Payment.amountTwd。
   */
  async updatePaymentWebhookLogVerification(id: string, options: {
    verified: boolean;
    signatureValid?: boolean | null;
    amountMatch?: boolean | null;
    errorMessage?: string | null;
  }): Promise<PaymentWebhookLog | null> {
    const existing = await prisma.paymentWebhookLog.findUnique({ where: { id } });
    if (!existing) return null;
    const data: Record<string, unknown> = {
      verified: options.verified,
      verifiedAt: options.verified ? new Date() : null,
    };
    if (options.signatureValid !== undefined) data.signatureValid = options.signatureValid;
    if (options.amountMatch !== undefined) data.amountMatch = options.amountMatch;
    if (options.errorMessage !== undefined) data.errorMessage = options.errorMessage;
    const updated = await prisma.paymentWebhookLog.update({ where: { id }, data });
    return toPaymentWebhookLog(updated);
  },
};

