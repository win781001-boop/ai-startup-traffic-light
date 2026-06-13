// ─── NewebPay Payment Provider — Skeleton ───
// Phase 3K: provider skeleton with env validation only.
// createPayment and verifyCallback are not yet implemented.
// Do NOT use in production until Phase 3N (notify verification) is complete.

import type {
  PaymentProvider,
  CreatePaymentInput,
  CreatePaymentResult,
  VerifyPaymentCallbackInput,
  VerifyPaymentCallbackResult,
} from "../types";

/**
 * Check that all required NewebPay environment variables are set.
 * Throws a descriptive error if any are missing.
 */
function requireEnvVars(): void {
  const required = [
    "NEWEBPAY_MERCHANT_ID",
    "NEWEBPAY_HASH_KEY",
    "NEWEBPAY_HASH_IV",
    "NEWEBPAY_MPG_URL",
  ] as const;

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing NewebPay environment variables: ${missing.join(", ")}`,
    );
  }
}

export const newebpayProvider: PaymentProvider = {
  getProviderName() {
    return "newebpay";
  },

  /**
   * Create a NewebPay MPG payment order.
   *
   * ─── SKELETON BEHAVIOR ───
   * - Validates that required env vars exist
   * - Throws "not implemented" — real TradeInfo/TradeSha generation
   *   will be added in Phase 3L.
   * - Never produces a fake paid/success result.
   */
  async createPayment(
    _input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    requireEnvVars();

    throw new Error("NewebPay createPayment is not implemented yet");
  },

  /**
   * Verify a NewebPay payment callback / webhook payload.
   *
   * ─── SKELETON BEHAVIOR ───
   * - Returns a safe failure result (paid: false).
   * - Does NOT trust any payload.
   * - Does NOT update Payment status.
   * - Real TradeSha verification + TradeInfo decryption
   *   will be added in Phase 3L / 3N.
   */
  async verifyCallback(
    _input: VerifyPaymentCallbackInput,
  ): Promise<VerifyPaymentCallbackResult> {
    return {
      provider: "newebpay",
      providerPaymentId: "not_verified",
      paid: false,
      amountTwd: undefined,
      raw: {
        status: "not_implemented",
        message: "NewebPay callback verification is not implemented yet",
      },
    };
  },
};
