// ─── ECPay (綠界) Payment Provider ───
// Phase 1: createPayment (AioCheckOut V5 formHtml) + verifyCallback.
// verifyCallback does CheckMacValue validation, RtnCode parsing, and amount extraction only.
// No DB writes, no Payment updates, no sandbox calls.

import type {
  PaymentProvider,
  CreatePaymentInput,
  CreatePaymentResult,
  VerifyPaymentCallbackInput,
  VerifyPaymentCallbackResult,
} from "../types";
import {
  buildCheckoutFormFields,
  buildCompleteCheckoutFields,
  verifyCheckMacValue,
} from "./ecpay-crypto";

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
 * Check that all required ECPay environment variables are set.
 * Throws a descriptive error if any are missing.
 */
function requireEnvVars(): void {
  const required = [
    "ECPAY_MERCHANT_ID",
    "ECPAY_HASH_KEY",
    "ECPAY_HASH_IV",
    "ECPAY_CHECKOUT_URL",
  ] as const;

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing ECPay environment variables: ${missing.join(", ")}`,
    );
  }
}

export const ecpayProvider: PaymentProvider = {
  getProviderName() {
    return "ecpay";
  },

  /**
   * Create an ECPay AioCheckOut V5 payment order.
   *
   * Generates CheckMacValue and returns an HTML form that auto-submits
   * to ECPay's AioCheckOut gateway.
   *
   * @throws Error if required env vars are missing
   * @throws Error if merchantOrderNo is not provided
   * @returns CreatePaymentResult with formHtml — does NOT represent payment success
   */
  async createPayment(
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    requireEnvVars();

    if (!input.merchantOrderNo) {
      throw new Error(
        "ECPay createPayment requires merchantOrderNo (paymentId)",
      );
    }

    const merchantId = process.env.ECPAY_MERCHANT_ID!;
    const hashKey = process.env.ECPAY_HASH_KEY!;
    const hashIV = process.env.ECPAY_HASH_IV!;
    const checkoutUrl = process.env.ECPAY_CHECKOUT_URL!;

    // Generate short alphanumeric MerchantTradeNo from payment.id
    // Input format: "pay-{ts36}-{rand4}" (17-18 chars with dashes)
    // Output format: "p{ts36}{rand4}" (13-14 chars, alphanumeric only)
    // ECPay limit: 20 chars, alphanumeric only
    const merchantTradeNo = input.merchantOrderNo
      .replace(/^pay-/, "p")
      .replace(/-/g, "");

    // Build form fields (without CheckMacValue)
    const fields = buildCheckoutFormFields(
      merchantId,
      merchantTradeNo,
      input.amountTwd,
      input.description || "AI Startup Traffic Light Report",
      "AI創業紅綠燈 首次完整報告",
      input.notifyUrl || "",
      {
        orderResultUrl: input.returnUrl,
        customerEmail: input.customerEmail,
      },
    );

    // Compute CheckMacValue and add to fields
    const completeFields = buildCompleteCheckoutFields(fields, hashKey, hashIV);

    // Build auto-submit HTML form (same pattern as NewebPay)
    const hiddenFields = Object.entries(completeFields)
      .map(
        ([name, value]) =>
          `    <input type="hidden" name="${esc(name)}" value="${esc(value)}" />`,
      )
      .join("\n");

    const formHtml = [
      `<form id="ecpay-form" method="post" action="${esc(checkoutUrl)}" style="display:none">`,
      hiddenFields,
      `  <noscript><button type="submit">前往付款頁面</button></noscript>`,
      `</form>`,
      `<script>document.getElementById("ecpay-form").submit();</script>`,
    ].join("\n");

    return {
      provider: "ecpay",
      providerPaymentId: merchantTradeNo,
      paymentUrl: checkoutUrl,
      formHtml,
      status: "pending",
      raw: {
        checkoutUrl,
        merchantTradeNo,        // short ECPay MerchantTradeNo (used in callback lookup)
        merchantOrderNo: input.merchantOrderNo,  // original payment.id (for reference)
        amountTwd: input.amountTwd,
        merchantId,
      },
    };
  },

  /**
   * Verify an ECPay payment callback / webhook payload.
   *
   * This is a pure parsing + verification function. It does NOT:
   *  - query the DB
   *  - update Payment records
   *  - create PaymentWebhookLog entries
   *  - call ECPay API
   *
   * Steps:
   *  1. Read required env vars (safe failure if missing)
   *  2. Verify CheckMacValue signature
   *  3. Extract MerchantTradeNo, TradeNo, RtnCode, TradeAmt
   *  4. Parse amount as integer
   *  5. Determine success/failure from RtnCode === "1"
   *  6. Build sanitized raw response (no HashKey/HashIV)
   */
  async verifyCallback(
    input: VerifyPaymentCallbackInput,
  ): Promise<VerifyPaymentCallbackResult> {
    const merchantId = process.env.ECPAY_MERCHANT_ID;
    const hashKey = process.env.ECPAY_HASH_KEY;
    const hashIV = process.env.ECPAY_HASH_IV;

    // 1. Missing env → safe failure; no stack trace, no key leak
    if (!merchantId || !hashKey || !hashIV) {
      return {
        provider: "ecpay",
        providerPaymentId: "not_verified",
        paid: false,
        raw: { reason: "missing_env" },
      };
    }

    const payload = input.payload;

    // 2. Verify CheckMacValue signature
    const checkResult = verifyCheckMacValue(payload, hashKey, hashIV);
    if (!checkResult.valid) {
      return {
        provider: "ecpay",
        providerPaymentId: "not_verified",
        paid: false,
        raw: { reason: checkResult.reason },
      };
    }

    // 3. Extract required fields
    const merchantTradeNo = String(payload.MerchantTradeNo || "");
    const tradeNo = String(payload.TradeNo || "");
    const rtnCode = String(payload.RtnCode || "");
    const tradeAmt = String(payload.TradeAmt || "");

    if (!merchantTradeNo || !tradeNo) {
      return {
        provider: "ecpay",
        providerPaymentId: "not_verified",
        paid: false,
        raw: { reason: "missing_required_fields" },
      };
    }

    // 4. Determine success/failure from RtnCode
    const paid = rtnCode === "1";

    // 5. Parse amount
    let parsedAmt: number | undefined;
    if (tradeAmt) {
      parsedAmt = parseInt(tradeAmt, 10);
      if (isNaN(parsedAmt)) {
        parsedAmt = undefined;
      }
    }

    // 5a. If paid, amount is required — reject if missing or zero-length
    if (paid && parsedAmt === undefined) {
      return {
        provider: "ecpay",
        providerPaymentId: "not_verified",
        paid: false,
        raw: { reason: "missing_amount" },
      };
    }

    // 6. Build sanitized raw (no HashKey/HashIV)
    const raw: Record<string, unknown> = {
      merchantTradeNo,
      tradeNo,
      rtnCode,
      rtnMsg: String(payload.RtnMsg || ""),
      tradeAmt: parsedAmt,
      paymentDate: String(payload.PaymentDate || ""),
      paymentType: String(payload.PaymentType || ""),
      paymentTypeChargeFee: String(payload.PaymentTypeChargeFee || ""),
    };
    // Include SimulatePaid if present (test-mode flag)
    if (payload.SimulatePaid !== undefined) {
      raw.simulatePaid = String(payload.SimulatePaid);
    }

    return {
      provider: "ecpay",
      providerPaymentId: tradeNo,
      paid,
      ...(parsedAmt !== undefined ? { amountTwd: parsedAmt } : {}),
      raw,
    };
  },
};


