import type { Payment, Analysis } from "./types";

// In-memory store (resets on server restart — MVP only)
const payments = new Map<string, Payment>();
const analyses = new Map<string, Analysis>();

function genId(prefix: string): string {
  const n = Date.now();
  const r = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${n.toString(36)}-${r}`;
}

export const recordStore = {
  // ─── Payment ───
  createPayment(): Payment {
    const now = new Date().toISOString();
    const p: Payment = {
      id: genId("pay"),
      status: "created",
      used: false,
      usedAt: null,
      createdAt: now,
      paidAt: now, // Mock: payment succeeds immediately
    };
    payments.set(p.id, p);
    return p;
  },

  getPayment(id: string): Payment | null {
    return payments.get(id) ?? null;
  },

  usePayment(id: string): Payment | null {
    const p = payments.get(id);
    if (!p || p.used) return null;
    p.used = true;
    p.usedAt = new Date().toISOString();
    payments.set(id, p);
    return p;
  },

  // ─── Analysis ───
  createAnalysis(data: {
    paymentId: string;
    inputs: Analysis["inputs"];
  }): Analysis {
    const now = new Date().toISOString();
    const a: Analysis = {
      id: genId("ana"),
      paymentId: data.paymentId,
      inputs: data.inputs,
      status: "submitted",
      signal: null,
      hasSignal: false,
      aiRawResponse: null,
      errorReason: null,
      createdAt: now,
      completedAt: null,
    };
    analyses.set(a.id, a);
    return a;
  },

  updateAnalysis(
    id: string,
    updates: Partial<Pick<Analysis, "status" | "signal" | "hasSignal" | "aiRawResponse" | "errorReason" | "completedAt">>
  ): Analysis | null {
    const a = analyses.get(id);
    if (!a) return null;
    Object.assign(a, updates);
    analyses.set(id, a);
    return a;
  },

  getAnalysis(id: string): Analysis | null {
    return analyses.get(id) ?? null;
  },
};
