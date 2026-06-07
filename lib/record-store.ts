import { prisma } from "./prisma";
import type { Payment, Analysis } from "./types";

function genId(prefix: string): string {
  const n = Date.now();
  const r = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${n.toString(36)}-${r}`;
}

export const recordStore = {
  // ─── Payment ───
  async createPayment(): Promise<Payment> {
    const now = new Date();
    const p = await prisma.payment.create({
      data: {
        id: genId("pay"),
        status: "created",
        used: false,
        usedAt: null,
        createdAt: now,
        paidAt: now, // Mock: payment succeeds immediately
      },
    });
    return {
      id: p.id,
      status: p.status as Payment["status"],
      used: p.used,
      usedAt: p.usedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
    };
  },

  async getPayment(id: string): Promise<Payment | null> {
    const p = await prisma.payment.findUnique({ where: { id } });
    if (!p) return null;
    return {
      id: p.id,
      status: p.status as Payment["status"],
      used: p.used,
      usedAt: p.usedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
    };
  },

  async usePayment(id: string): Promise<Payment | null> {
    const p = await prisma.payment.findUnique({ where: { id } });
    if (!p || p.used) return null;
    const updated = await prisma.payment.update({
      where: { id },
      data: { used: true, usedAt: new Date() },
    });
    return {
      id: updated.id,
      status: updated.status as Payment["status"],
      used: updated.used,
      usedAt: updated.usedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      paidAt: updated.paidAt?.toISOString() ?? null,
    };
  },

  // ─── Analysis ───
  async createAnalysis(data: {
    paymentId: string;
    inputs: Analysis["inputs"];
  }): Promise<Analysis> {
    const id = genId("ana");
    const submissionId = genId("sub");
    const now = new Date();

    const analysis = await prisma.$transaction(async (tx) => {
      await tx.submission.create({
        data: {
          id: submissionId,
          paymentId: data.paymentId,
          status: "submitted",
          idea: data.inputs.idea,
          targetUser: data.inputs.targetUser,
          problem: data.inputs.problem,
          pricing: data.inputs.pricing,
          firstVersion: data.inputs.firstVersion,
          buildTime: data.inputs.buildTime,
          createdAt: now,
        },
      });

      return tx.analysis.create({
        data: {
          id,
          submissionId,
          paymentId: data.paymentId,
          status: "submitted",
          used: false,
          signal: null,
          hasSignal: false,
          aiRawResponse: null,
          errorReason: null,
          createdAt: now,
          completedAt: null,
        },
      });
    });

    return {
      id: analysis.id,
      paymentId: analysis.paymentId,
      inputs: data.inputs,
      used: analysis.used,
      status: analysis.status as Analysis["status"],
      signal: analysis.signal as Analysis["signal"],
      hasSignal: analysis.hasSignal,
      aiRawResponse: analysis.aiRawResponse,
      errorReason: analysis.errorReason,
      createdAt: analysis.createdAt.toISOString(),
      completedAt: analysis.completedAt?.toISOString() ?? null,
    };
  },

  async updateAnalysis(
    id: string,
    updates: Partial<
      Pick<Analysis, "status" | "signal" | "hasSignal" | "aiRawResponse" | "errorReason" | "completedAt" | "used">
    >
  ): Promise<Analysis | null> {
    const existing = await prisma.analysis.findUnique({
      where: { id },
      include: { submission: true },
    });
    if (!existing) return null;

    const data: Record<string, unknown> = {};
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.signal !== undefined) data.signal = updates.signal;
    if (updates.hasSignal !== undefined) data.hasSignal = updates.hasSignal;
    if (updates.aiRawResponse !== undefined) data.aiRawResponse = updates.aiRawResponse;
    if (updates.errorReason !== undefined) data.errorReason = updates.errorReason;
    if (updates.completedAt !== undefined)
      data.completedAt = updates.completedAt ? new Date(updates.completedAt) : null;
    if (updates.used !== undefined) data.used = updates.used;

    const updated = await prisma.analysis.update({
      where: { id },
      data,
      include: { submission: true },
    });

    return {
      id: updated.id,
      paymentId: updated.paymentId,
      inputs: {
        idea: updated.submission.idea,
        targetUser: updated.submission.targetUser,
        problem: updated.submission.problem,
        pricing: updated.submission.pricing,
        firstVersion: updated.submission.firstVersion,
        buildTime: updated.submission.buildTime,
      },
      used: updated.used,
      status: updated.status as Analysis["status"],
      signal: updated.signal as Analysis["signal"],
      hasSignal: updated.hasSignal,
      aiRawResponse: updated.aiRawResponse,
      errorReason: updated.errorReason,
      createdAt: updated.createdAt.toISOString(),
      completedAt: updated.completedAt?.toISOString() ?? null,
    };
  },

  async getAnalysis(id: string): Promise<Analysis | null> {
    const a = await prisma.analysis.findUnique({
      where: { id },
      include: { submission: true },
    });
    if (!a) return null;
    return {
      id: a.id,
      paymentId: a.paymentId,
      inputs: {
        idea: a.submission.idea,
        targetUser: a.submission.targetUser,
        problem: a.submission.problem,
        pricing: a.submission.pricing,
        firstVersion: a.submission.firstVersion,
        buildTime: a.submission.buildTime,
      },
      used: a.used,
      status: a.status as Analysis["status"],
      signal: a.signal as Analysis["signal"],
      hasSignal: a.hasSignal,
      aiRawResponse: a.aiRawResponse,
      errorReason: a.errorReason,
      createdAt: a.createdAt.toISOString(),
      completedAt: a.completedAt?.toISOString() ?? null,
    };
  },
};
