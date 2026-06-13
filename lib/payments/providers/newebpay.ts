// ─── NewebPay Payment Provider ───
// Phase 3N-C: createPayment (Phase 3M) + verifyCallback (Phase 3N-C).
// verifyCallback does signature validation, decryption, and status parsing only.
// No DB writes, no Payment updates, no sandbox calls.
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
  decryptTradeInfo,
  createTradeSha,
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
   * This is a pure parsing + verification function. It does NOT:
   *  - query the DB
   *  - update Payment records
   *  - create PaymentWebhookLog entries
   *  - call the NewebPay sandbox
   *
   * Steps:
   *  1. Read required env vars (safe failure if missing)
   *  2. Check required payload fields (MerchantID, TradeInfo, TradeSha, Status)
   *  3. Verify TradeSha signature
   *  4. Decrypt TradeInfo (AES-256-CBC)
   *  5. Parse decrypted content (JSON or URL-encoded)
   *  6. Verify MerchantID (payload + decrypted)
   *  7. Extract merchantOrderNo, Amt, TradeNo, Status, PayTime, PaymentType
   *  8. Parse Amt as integer
   *  9. Determine success/failure from Status
   *  10. Build sanitized raw response (no HashKey/HashIV/Card6No/Card4No)
   */
  async verifyCallback(
    input: VerifyPaymentCallbackInput,
  ): Promise<VerifyPaymentCallbackResult> {
    const merchantId = process.env.NEWEBPAY_MERCHANT_ID;
    const hashKey = process.env.NEWEBPAY_HASH_KEY;
    const hashIv = process.env.NEWEBPAY_HASH_IV;

    // 1. Missing env → safe failure; no stack trace, no key leak
    if (!merchantId || !hashKey || !hashIv) {
      return {
        provider: "newebpay",
        providerPaymentId: "not_verified",
        paid: false,
        raw: { reason: "missing_env" },
      };
    }

    const payload = input.payload;

    // 2. Check required payload fields
    const requiredFields = ["MerchantID", "TradeInfo", "TradeSha", "Status"] as const;
    const missingFields = requiredFields.filter((f) => !payload[f]);
    if (missingFields.length > 0) {
      return {
        provider: "newebpay",
        providerPaymentId: "not_verified",
        paid: false,
        raw: {
          reason: "missing_field",
          missingFields,
        },
      };
    }

    const payloadMerchantId = String(payload.MerchantID);
    const tradeInfo = String(payload.TradeInfo);
    const tradeSha = String(payload.TradeSha);
    const status = String(payload.Status);

    // 3. Verify TradeSha signature
    const expectedSha = createTradeSha(tradeInfo, hashKey, hashIv);
    if (expectedSha !== tradeSha.toUpperCase()) {
      return {
        provider: "newebpay",
        providerPaymentId: "not_verified",
        paid: false,
        raw: { reason: "invalid_signature" },
      };
    }

    // 4. Decrypt TradeInfo (AES-256-CBC)
    let decryptedStr: string;
    try {
      decryptedStr = decryptTradeInfo(tradeInfo, hashKey, hashIv);
    } catch {
      return {
        provider: "newebpay",
        providerPaymentId: "not_verified",
        paid: false,
        raw: { reason: "decrypt_failed" },
      };
    }

    // 5. Parse decrypted TradeInfo (supports JSON and URL-encoded)
    let decrypted: Record<string, unknown>;
    try {
      const trimmed = decryptedStr.trim();
      if (trimmed.startsWith("{")) {
        decrypted = JSON.parse(trimmed);
      } else {
        const params = new URLSearchParams(trimmed);
        decrypted = Object.fromEntries(params.entries());
      }
    } catch {
      return {
        provider: "newebpay",
        providerPaymentId: "not_verified",
        paid: false,
        raw: { reason: "parse_failed" },
      };
    }

    // 6. Verify MerchantID
    if (payloadMerchantId !== merchantId) {
      return {
        provider: "newebpay",
        providerPaymentId: "not_verified",
        paid: false,
        raw: { reason: "merchant_mismatch" },
      };
    }
    if (
      decrypted.MerchantID !== undefined &&
      String(decrypted.MerchantID) !== merchantId
    ) {
      return {
        provider: "newebpay",
        providerPaymentId: "not_verified",
        paid: false,
        raw: { reason: "merchant_mismatch" },
      };
    }

    // 7. Extract relevant fields from decrypted payload
    const merchantOrderNo =
      decrypted.MerchantOrderNo !== undefined
        ? String(decrypted.MerchantOrderNo)
        : undefined;
    const decryptedAmt = decrypted.Amt;
    const tradeNo =
      decrypted.TradeNo !== undefined ? String(decrypted.TradeNo) : undefined;
    const decryptedStatus =
      decrypted.Status !== undefined ? String(decrypted.Status) : undefined;
    const payTime =
      decrypted.PayTime !== undefined ? String(decrypted.PayTime) : undefined;
    const paymentType =
      decrypted.PaymentType !== undefined
        ? String(decrypted.PaymentType)
        : undefined;

    // 8. Parse Amt as integer
    let parsedAmt: number | undefined;
    if (decryptedAmt !== undefined) {
      parsedAmt = parseInt(String(decryptedAmt), 10);
      if (isNaN(parsedAmt) || String(parsedAmt) !== String(decryptedAmt)) {
        return {
          provider: "newebpay",
          providerPaymentId: tradeNo || "not_verified",
          paid: false,
          raw: buildRawOnError(
            merchantOrderNo,
            tradeNo,
            decryptedStatus,
            payTime,
            paymentType,
            undefined,
            "invalid_amount",
          ),
        };
      }
    }

    // 9. Determine success/failure
    const isSuccess = status === "SUCCESS" || decryptedStatus === "1";
    const paid = isSuccess;

    // paid:true requires TradeNo to exist
    const finalPaid = paid && !!tradeNo;
    const providerPaymentId = tradeNo || "not_verified";

    // 10. Build sanitized raw (no HashKey/HashIV/Card6No/Card4No)
    const raw = buildRaw(
      merchantOrderNo,
      tradeNo,
      decryptedStatus,
      payTime,
      parsedAmt,
      paymentType,
      decrypted,
    );

    return {
      provider: "newebpay",
      providerPaymentId,
      paid: finalPaid,
      ...(parsedAmt !== undefined ? { amountTwd: parsedAmt } : {}),
      raw,
    };
  },
};

/**
 * Build a raw result object for successful / non-error callbacks.
 * Filters out sensitive fields (Card6No, Card4No) from sanitizedPayload.
 */
function buildRaw(
  merchantOrderNo: string | undefined,
  tradeNo: string | undefined,
  decryptedStatus: string | undefined,
  payTime: string | undefined,
  amountTwd: number | undefined,
  paymentType: string | undefined,
  decrypted: Record<string, unknown>,
): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  if (merchantOrderNo !== undefined) raw.merchantOrderNo = merchantOrderNo;
  if (tradeNo !== undefined) raw.tradeNo = tradeNo;
  if (decryptedStatus !== undefined) raw.status = decryptedStatus;
  if (payTime !== undefined) raw.payTime = payTime;
  if (amountTwd !== undefined) raw.amountTwd = amountTwd;
  if (paymentType !== undefined) raw.paymentType = paymentType;

  // Build sanitized payload excluding Card6No / Card4No
  const sanitizedPayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(decrypted)) {
    if (key === "Card6No" || key === "Card4No") continue;
    sanitizedPayload[key] = value;
  }
  raw.sanitizedPayload = sanitizedPayload;

  return raw;
}

/**
 * Build a raw result object for error callbacks (no sanitizedPayload).
 */
function buildRawOnError(
  merchantOrderNo: string | undefined,
  tradeNo: string | undefined,
  decryptedStatus: string | undefined,
  payTime: string | undefined,
  paymentType: string | undefined,
  amountTwd: number | undefined,
  reason: string,
): Record<string, unknown> {
  const raw: Record<string, unknown> = { reason };
  if (merchantOrderNo !== undefined) raw.merchantOrderNo = merchantOrderNo;
  if (tradeNo !== undefined) raw.tradeNo = tradeNo;
  if (decryptedStatus !== undefined) raw.status = decryptedStatus;
  if (payTime !== undefined) raw.payTime = payTime;
  if (amountTwd !== undefined) raw.amountTwd = amountTwd;
  if (paymentType !== undefined) raw.paymentType = paymentType;
  return raw;
}
