import { prisma } from "./prisma";
import type { Payment, Analysis, Feedback } from "./types";

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
}): Payment {
  return {
    id: p.id, status: p.status as Payment["status"], used: p.used,
    usedAt: p.usedAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString(),
    paidAt: p.paidAt?.toISOString() ?? null,
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

export const recordStore = {
  async createPayment(): Promise<{ payment: Payment; analysis: Analysis }> {
    const paymentId = genId("pay");
    const analysisId = genId("ana");
    const submissionId = genId("sub");
    const now = new Date();

    // Sequential creates: avoids prisma.$transaction timeout with Neon WebSocket adapter.
    // These three INSERTs are independent and do not need atomic wrapping.
    const p = await prisma.payment.create({
        data: { id: paymentId, status: "pending", used: false, usedAt: null, createdAt: now, paidAt: null },
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
};

