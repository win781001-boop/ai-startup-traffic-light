// ─── Mock Payment Provider ───
// For local development and testing only. Never use in production.

import type {
  PaymentProvider,
  CreatePaymentInput,
  CreatePaymentResult,
  VerifyPaymentCallbackInput,
  VerifyPaymentCallbackResult,
} from "../types";

function generateMockId(): string {
  return "mock_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
}

export const mockPaymentProvider: PaymentProvider = {
  getProviderName() {
    return "mock";
  },

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return {
      provider: "mock",
      providerPaymentId: generateMockId(),
      paymentUrl: null,
      status: "created",
      raw: { ...input },
    };
  },

  /**
   * Verify a mock payment callback.
   *
   * IMPORTANT: This is for development/testing only.
   * In production, never use mock verification — real payment providers
   * require signature validation, amount checks, and idempotency handling.
   * Switch to a real PaymentProvider (e.g. newebpay) before going live.
   */
  async verifyCallback(input: VerifyPaymentCallbackInput): Promise<VerifyPaymentCallbackResult> {
    return {
      provider: "mock",
      providerPaymentId: (input.payload?.providerPaymentId as string) || "mock_unknown",
      paid: true,
      amountTwd: input.payload?.amountTwd as number | undefined,
      raw: { ...(input.payload as Record<string, unknown>) },
    };
  },
};
