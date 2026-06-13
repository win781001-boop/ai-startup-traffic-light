// ─── NewebPay Payment Provider ───
// Phase 3M: createPayment generates real MPG form fields and formHtml.
// verifyCallback is still safe failure — will be implemented in Phase 3N.
// Do NOT use in production until Phase 3N (notify verification) is complete.

import type {
  PaymentProvider,
  CreatePaymentInput,
  CreatePaymentResult,
  VerifyPaymentCallbackInput,
  VerifyPaymentCallbackResult,
} from "../types";
import {
  buildTradeInfoPayload,
  buildMpgFormFields,
} from "./newebpay-crypto";

/**
 * Minimal HTML-entity escape for attribute values.
 */
function esc(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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
   * Generates encrypted TradeInfo / TradeSha and returns an HTML form
   * that auto-submits to NewebPay's MPG gateway.
   *
   * @throws Error if required env vars are missing
   * @throws Error if merchantOrderNo is not provided in input
   * @returns CreatePaymentResult with formHtml — does NOT represent payment success
   */
  async createPayment(
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    requireEnvVars();

    if (!input.merchantOrderNo) {
      throw new Error(
        "NewebPay createPayment requires merchantOrderNo (paymentId)",
      );
    }

    const merchantId = process.env.NEWEBPAY_MERCHANT_ID!;
    const hashKey = process.env.NEWEBPAY_HASH_KEY!;
    const hashIv = process.env.NEWEBPAY_HASH_IV!;
    const mpgUrl = process.env.NEWEBPAY_MPG_URL!;

    const payload = buildTradeInfoPayload(
      merchantId,
      input.merchantOrderNo,
      input.amountTwd,
      input.description || "AI Startup Traffic Light Report",
      {
        Email: input.customerEmail,
        NotifyURL: input.notifyUrl,
        ReturnURL: input.returnUrl,
      },
    );

    const form = buildMpgFormFields(payload, hashKey, hashIv);

    // Build auto-submit HTML form
    const inputs = [
      { name: "MerchantID", value: form.MerchantID },
      { name: "TradeInfo", value: form.TradeInfo },
      { name: "TradeSha", value: form.TradeSha },
      { name: "Version", value: form.Version },
      { name: "EncryptType", value: "1" },
    ];

    const hiddenFields = inputs
      .map(
        (f) =>
          `    <input type="hidden" name="${esc(f.name)}" value="${esc(f.value)}" />`,
      )
      .join("\n");

    const formHtml = [
      `<form id="newebpay-form" method="post" action="${esc(mpgUrl)}" style="display:none">`,
      hiddenFields,
      `  <noscript><button type="submit">前往付款頁面</button></noscript>`,
      `</form>`,
      `<script>document.getElementById("newebpay-form").submit();</script>`,
    ].join("\n");

    return {
      provider: "newebpay",
      providerPaymentId: input.merchantOrderNo,
      paymentUrl: mpgUrl,
      formHtml,
      status: "pending",
      raw: {
        mpgUrl,
        merchantOrderNo: input.merchantOrderNo,
        amountTwd: input.amountTwd,
        formFields: {
          MerchantID: form.MerchantID,
          TradeInfo: form.TradeInfo,
          TradeSha: form.TradeSha,
          Version: form.Version,
        },
      },
    };
  },

  /**
   * Verify a NewebPay payment callback / webhook payload.
   *
   * ─── SAFE FAILURE (not yet implemented) ───
   * Returns paid: false. Does NOT trust any payload.
   * Real verification will be added in Phase 3N.
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
