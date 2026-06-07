import { prisma } from "./prisma";
import type { Payment, Analysis, Feedback } from "./types";

function genId(prefix: string): string {
  const n = Date.now();
  const r = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${n.toString(36)}-${r}`;
}

export const recordStore = {
  async createPayment(): Promise<{ payment: Payment; analysis: Analysis }> {
    const paymentId = genId("pay");
    const analysisId = genId("ana");
    const submissionId = genId("sub");
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: { id: paymentId, status: "pending", used: false, usedAt: null, createdAt: now, paidAt: null },
      });
      await tx.submission.create({
        data: { id: submissionId, paymentId, status: "pending", idea: "", targetUser: "", problem: "", pricing: "", firstVersion: "", buildTime: "", createdAt: now },
      });
      const a = await tx.analysis.create({
        data: { id: analysisId, submissionId, paymentId, status: "pending", used: false, signal: null, hasSignal: false, aiRawResponse: null, errorReason: null, attemptCount: 0, maxAttempts: 3, createdAt: now, completedAt: null },
      });
      return { p, a };
    });

    return {
      payment: {
        id: result.p.id, status: result.p.status as Payment["status"], used: result.p.used,
        usedAt: result.p.usedAt?.toISOString() ?? null, createdAt: result.p.createdAt.toISOString(),
        paidAt: result.p.paidAt?.toISOString() ?? null,
      },
      analysis: {
        id: result.a.id, paymentId: result.a.paymentId,
        inputs: { idea: "", targetUser: "", problem: "", pricing: "", firstVersion: "", buildTime: "" },
        used: result.a.used, status: result.a.status as Analysis["status"],
        signal: result.a.signal as Analysis["signal"], hasSignal: result.a.hasSignal,
        attemptCount: result.a.attemptCount, maxAttempts: result.a.maxAttempts,
        aiRawResponse: result.a.aiRawResponse, errorReason: result.a.errorReason,
        createdAt: result.a.createdAt.toISOString(), completedAt: result.a.completedAt?.toISOString() ?? null,
      },
    };
  },

  async confirmPayment(id: string): Promise<Payment | null> {
    const p = await prisma.payment.findUnique({ where: { id }, include: { analyses: true } });
    if (!p || p.status !== "pending") return null;
    const now = new Date();
    const updated = await prisma.payment.update({ where: { id }, data: { status: "paid", paidAt: now } });
    const analysis = await prisma.analysis.findFirst({ where: { paymentId: id } });
    if (analysis) await prisma.analysis.update({ where: { id: analysis.id }, data: { status: "submitted" } });
    return {
      id: updated.id, status: updated.status as Payment["status"], used: updated.used,
      usedAt: updated.usedAt?.toISOString() ?? null, createdAt: updated.createdAt.toISOString(),
      paidAt: updated.paidAt?.toISOString() ?? null,
    };
  },

  async getPayment(id: string): Promise<Payment | null> {
    const p = await prisma.payment.findUnique({ where: { id } });
    if (!p) return null;
    return {
      id: p.id, status: p.status as Payment["status"], used: p.used,
      usedAt: p.usedAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
    };
  },

  async usePayment(id: string): Promise<Payment | null> {
    const p = await prisma.payment.findUnique({ where: { id } });
    if (!p || p.used) return null;
    const updated = await prisma.payment.update({ where: { id }, data: { used: true, usedAt: new Date() } });
    return {
      id: updated.id, status: updated.status as Payment["status"], used: updated.used,
      usedAt: updated.usedAt?.toISOString() ?? null, createdAt: updated.createdAt.toISOString(),
      paidAt: updated.paidAt?.toISOString() ?? null,
    };
  },

  async updateAnalysisInputs(analysisId: string, inputs: Analysis["inputs"]): Promise<Analysis> {
    const existing = await prisma.analysis.findUnique({ where: { id: analysisId }, include: { submission: true } });
    if (!existing) throw new Error("Analysis not found");
    await prisma.submission.update({
      where: { id: existing.submission.id },
      data: { idea: inputs.idea, targetUser: inputs.targetUser, problem: inputs.problem,
        pricing: inputs.pricing, firstVersion: inputs.firstVersion, buildTime: inputs.buildTime, status: "submitted" },
    });
    return {
      id: existing.id, paymentId: existing.paymentId, inputs,
      used: existing.used, status: existing.status as Analysis["status"],
      signal: existing.signal as Analysis["signal"], hasSignal: existing.hasSignal,
      attemptCount: existing.attemptCount, maxAttempts: existing.maxAttempts,
      aiRawResponse: existing.aiRawResponse, errorReason: existing.errorReason,
      createdAt: existing.createdAt.toISOString(), completedAt: existing.completedAt?.toISOString() ?? null,
    };
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
    return {
      id: updated.id, paymentId: updated.paymentId,
      inputs: { idea: updated.submission.idea, targetUser: updated.submission.targetUser,
        problem: updated.submission.problem, pricing: updated.submission.pricing,
        firstVersion: updated.submission.firstVersion, buildTime: updated.submission.buildTime },
      used: updated.used, status: updated.status as Analysis["status"],
      signal: updated.signal as Analysis["signal"], hasSignal: updated.hasSignal,
      attemptCount: updated.attemptCount, maxAttempts: updated.maxAttempts,
      aiRawResponse: updated.aiRawResponse, errorReason: updated.errorReason,
      createdAt: updated.createdAt.toISOString(), completedAt: updated.completedAt?.toISOString() ?? null,
    };
  },

  async getAnalysis(id: string): Promise<Analysis | null> {
    const a = await prisma.analysis.findUnique({ where: { id }, include: { submission: true } });
    if (!a) return null;
    return {
      id: a.id, paymentId: a.paymentId,
      inputs: { idea: a.submission.idea, targetUser: a.submission.targetUser,
        problem: a.submission.problem, pricing: a.submission.pricing,
        firstVersion: a.submission.firstVersion, buildTime: a.submission.buildTime },
      used: a.used, status: a.status as Analysis["status"],
      signal: a.signal as Analysis["signal"], hasSignal: a.hasSignal,
      attemptCount: a.attemptCount, maxAttempts: a.maxAttempts,
      aiRawResponse: a.aiRawResponse, errorReason: a.errorReason,
      createdAt: a.createdAt.toISOString(), completedAt: a.completedAt?.toISOString() ?? null,
    };
  },

  async getAnalysisByPaymentId(paymentId: string): Promise<Analysis | null> {
    const a = await prisma.analysis.findFirst({ where: { paymentId }, include: { submission: true } });
    if (!a) return null;
    return {
      id: a.id, paymentId: a.paymentId,
      inputs: { idea: a.submission.idea, targetUser: a.submission.targetUser,
        problem: a.submission.problem, pricing: a.submission.pricing,
        firstVersion: a.submission.firstVersion, buildTime: a.submission.buildTime },
      used: a.used, status: a.status as Analysis["status"],
      signal: a.signal as Analysis["signal"], hasSignal: a.hasSignal,
      attemptCount: a.attemptCount, maxAttempts: a.maxAttempts,
      aiRawResponse: a.aiRawResponse, errorReason: a.errorReason,
      createdAt: a.createdAt.toISOString(), completedAt: a.completedAt?.toISOString() ?? null,
    };
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
