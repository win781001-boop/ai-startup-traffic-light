import { recordStore } from "@/lib/record-store";
import { getPaymentProvider } from "@/lib/payments";

/**
 * Phase 3N-R-B — Mock webhook + NewebPay NotifyURL + ECPay ReturnURL route.
 *
 * Content-Type routing:
 *   application/json: mock webhook (dev/test only)
 *   application/x-www-form-urlencoded: NewebPay NotifyURL or ECPay ReturnURL callback
 *
 * Provider routing (PAYMENT_PROVIDER env):
 *   "mock" / unset → handleMockWebhook (JSON)
 *   "newebpay"    → handleNewebPayWebhook (form-urlencoded)
 *   "ecpay"       → handleECPayWebhook (form-urlencoded, returns "1|OK")
 *
 * All scenarios return 200 to prevent provider retry storms.
 */

interface PaymentWebhookPayload {
  providerName: string;
  providerEventId?: string;
  providerPaymentId?: string;
  paymentId?: string;
  eventType: string;
  amountTwd: number;
  signature: string;
}

export async function POST(request: Request) {
  const paymentProvider = (process.env.PAYMENT_PROVIDER || "").trim();

  // Mock provider branch (existing behavior preserved)
  if (!paymentProvider || paymentProvider === "mock") {
    return handleMockWebhook(request);
  }

  // NewebPay provider branch
  if (paymentProvider === "newebpay") {
    return handleNewebPayWebhook(request);
  }

  // ECPay provider branch
  if (paymentProvider === "ecpay") {
    return handleECPayWebhook(request);
  }

  // Unknown provider — reject safely
  return new Response(null, { status: 404 });
}

// ─── Mock webhook handler (unchanged) ───

async function handleMockWebhook(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  let payload: PaymentWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  if (!payload.providerName || !payload.eventType || payload.amountTwd === undefined || !payload.signature) {
    return Response.json({ ok: false, error: "missing required fields" }, { status: 400 });
  }

  const { providerName, providerEventId, providerPaymentId, paymentId, eventType, amountTwd, signature } = payload;
  const rawPayload = JSON.stringify(payload);

  let dedupeKey: string;
  if (providerEventId) {
    dedupeKey = `${providerName}:${providerEventId}`;
  } else if (providerPaymentId) {
    dedupeKey = `${providerName}:${providerPaymentId}:${eventType}`;
  } else {
    return Response.json({ ok: false, error: "cannot build dedupe key" }, { status: 400 });
  }

  const existing = await recordStore.getPaymentWebhookLogByDedupeKey(dedupeKey);
  if (existing) {
    return Response.json({ ok: true, duplicated: true });
  }

  const log = await recordStore.createPaymentWebhookLog({
    paymentId: paymentId ?? null, providerName,
    providerEventId: providerEventId ?? null, providerPaymentId: providerPaymentId ?? null,
    dedupeKey, eventType, rawPayload,
  });

  const signatureValid = signature === "mock-valid";
  let payment = null;
  if (paymentId) {
    payment = await recordStore.getPayment(paymentId);
  }

  if (!paymentId || !payment) {
    await recordStore.updatePaymentWebhookLogVerification(log.id, { verified: true, signatureValid, errorMessage: "payment not found" });
    await recordStore.markPaymentWebhookLogProcessed(log.id, { errorMessage: "payment not found" });
    return Response.json({ ok: true, processed: false, reason: "payment_not_found" });
  }

  if (!signatureValid) {
    await recordStore.updatePaymentWebhookLogVerification(log.id, { verified: true, signatureValid: false, errorMessage: "invalid signature" });
    await recordStore.markPaymentWebhookLogProcessed(log.id, { errorMessage: "invalid signature" });
    return Response.json({ ok: true, processed: false, reason: "invalid_signature" });
  }

  const amountMatch = payment.amountTwd === amountTwd;
  if (!amountMatch) {
    await recordStore.updatePaymentWebhookLogVerification(log.id, { verified: true, signatureValid: true, amountMatch: false, errorMessage: "amount mismatch" });
    await recordStore.markPaymentWebhookLogProcessed(log.id, { errorMessage: "amount mismatch" });
    return Response.json({ ok: true, processed: false, reason: "amount_mismatch" });
  }

  await recordStore.updatePaymentWebhookLogVerification(log.id, { verified: true, signatureValid: true, amountMatch: true });
  const updatedPayment = await recordStore.confirmPaymentByWebhook(paymentId!, { providerPaymentId: providerPaymentId ?? paymentId, providerName });
  console.log("[payment-webhook] confirmPayment result:", !!updatedPayment);
  if (!updatedPayment) {
    await recordStore.markPaymentWebhookLogProcessed(log.id, { errorMessage: "payment already processed" });
    return Response.json({ ok: true, processed: false, reason: "payment_already_processed" });
  }
  await recordStore.markPaymentWebhookLogProcessed(log.id);
  return Response.json({ ok: true, processed: true });
}

// ─── NewebPay NotifyURL handler (unchanged) ───

async function handleNewebPayWebhook(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  const isFormUrlEncoded = contentType.includes("application/x-www-form-urlencoded");

  let payload: Record<string, unknown>;
  let rawBody: string;

  if (isFormUrlEncoded) {
    rawBody = await request.text();
    const params = new URLSearchParams(rawBody);
    payload = Object.fromEntries(params.entries());
  } else {
    return Response.json({ ok: false, error: "newebpay requires application/x-www-form-urlencoded" }, { status: 400 });
  }

  let verifyResult;
  try {
    const provider = getPaymentProvider("newebpay");
    verifyResult = await provider.verifyCallback({ provider: "newebpay", payload, rawBody, headers: Object.fromEntries(request.headers.entries()) });
  } catch {
    return Response.json({ ok: true, processed: false, reason: "callback_error" });
  }

  if (!verifyResult.paid) {
    const reason = (verifyResult.raw?.reason as string) || "not_paid";
    const logDedupeKey = buildNewebPayDedupeKey(verifyResult.providerPaymentId, verifyResult.raw?.merchantOrderNo as string | undefined, verifyResult.raw?.status as string | undefined);
    if (logDedupeKey) {
      const existing = await recordStore.getPaymentWebhookLogByDedupeKey(logDedupeKey);
      if (!existing) {
        try { await recordStore.createPaymentWebhookLog({ dedupeKey: logDedupeKey, providerName: "newebpay", providerPaymentId: verifyResult.providerPaymentId !== "not_verified" ? verifyResult.providerPaymentId : null, rawPayload: rawBody, eventType: "payment_callback" }); } catch { /* non-fatal */ }
      }
    }
    return Response.json({ ok: true, processed: false, reason });
  }

  const paymentId = verifyResult.raw?.merchantOrderNo as string | undefined;
  if (!paymentId) return Response.json({ ok: true, processed: false, reason: "missing_payment_id" });

  const payment = await recordStore.getPayment(paymentId);
  if (!payment) return Response.json({ ok: true, processed: false, reason: "payment_not_found" });

  if (verifyResult.amountTwd !== undefined && verifyResult.amountTwd !== payment.amountTwd) {
    return Response.json({ ok: true, processed: false, reason: "amount_mismatch" });
  }

  const providerPaymentId = verifyResult.providerPaymentId;
  if (!providerPaymentId || providerPaymentId === "not_verified") {
    return Response.json({ ok: true, processed: false, reason: "invalid_provider_payment_id" });
  }

  const dedupeKey = `newebpay:${providerPaymentId}`;
  const existing = await recordStore.getPaymentWebhookLogByDedupeKey(dedupeKey);
  if (existing) return Response.json({ ok: true, duplicated: true, processed: false });

  let log;
  try { log = await recordStore.createPaymentWebhookLog({ paymentId, providerName: "newebpay", providerPaymentId, dedupeKey, eventType: "payment_paid", rawPayload: rawBody }); } catch { return Response.json({ ok: true, processed: false, reason: "log_failed" }); }

  await recordStore.updatePaymentWebhookLogVerification(log.id, { verified: true, signatureValid: true, amountMatch: true });
  const updatedPayment = await recordStore.confirmPaymentByWebhook(payment.id, { providerPaymentId, providerName: "newebpay" });
  console.log("[payment-webhook] confirmPayment result:", !!updatedPayment);
  if (!updatedPayment) {
    await recordStore.markPaymentWebhookLogProcessed(log.id, { errorMessage: "payment already processed" });
    return Response.json({ ok: true, processed: false, reason: "payment_already_processed" });
  }

  await recordStore.markPaymentWebhookLogProcessed(log.id);
  return Response.json({ ok: true, processed: true });
}

/**
 * Build a dedupeKey for NewebPay callbacks.
 */
function buildNewebPayDedupeKey(
  providerPaymentId: string,
  merchantOrderNo: string | undefined,
  status: string | undefined,
): string | null {
  if (providerPaymentId && providerPaymentId !== "not_verified") {
    if (status) return `newebpay:${providerPaymentId}:${status}`;
    return `newebpay:${providerPaymentId}`;
  }
  if (merchantOrderNo && status) return `newebpay:${merchantOrderNo}:${status}`;
  return null;
}

// ─── ECPay ReturnURL handler ───

/**
 * Handle ECPay ReturnURL callback.
 *
 * ECPay sends POST form-urlencoded to the ReturnURL we specified
 * in the checkout form. ECPay expects a plain-text response:
 *   "1|OK" on successful receipt
 *   "0|reason" on failure (will trigger ECPay retries)
 *
 * Flow:
 *   1. Parse form-urlencoded body
 *   2. Call ecpayProvider.verifyCallback() (CheckMacValue + RtnCode)
 *   3. If not paid → acknowledge with "1|OK" but do NOT update Payment
 *   4. If paid → lookup Payment by MerchantTradeNo (= paymentId)
 *   5. Verify amount matches
 *   6. Dedupe via PaymentWebhookLog (dedupeKey = "ecpay:{TradeNo}")
 *   7. confirmPaymentByWebhook()
 *   8. Return "1|OK"
 *
 * Safety:
 *   - CheckMacValue verification prevents forged callbacks
 *   - Duplicate callback check prevents double-spend
 *   - Only updates Payment if status === "pending"
 *   - Does NOT trust OrderResultURL or ClientBackURL for payment confirmation
 */
async function handleECPayWebhook(request: Request): Promise<Response> {
  console.log("[payment-webhook] entered", JSON.stringify({
    method: request.method,
    url: request.url,
    contentType: request.headers.get("content-type") ?? "",
  }));
  // 1. Parse form-urlencoded body
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    console.log("[payment-webhook] content-type error, returning 0|content_type_error");
    return new Response("0|content_type_error");
  }

  const rawBody = await request.text();
  console.log("[payment-webhook] raw body length:", rawBody.length);
  const params = new URLSearchParams(rawBody);
  const payload: Record<string, unknown> = Object.fromEntries(params.entries());
  console.log("[payment-webhook] parsed params", JSON.stringify({
    hasMerchantTradeNo: !!payload.MerchantTradeNo,
    hasTradeNo: !!payload.TradeNo,
    RtnCode: payload.RtnCode ?? "(missing)",
    RtnMsg: (payload.RtnMsg ?? "(missing)").toString().slice(0, 100),
    hasCheckMacValue: !!payload.CheckMacValue,
    allKeys: Object.keys(payload),
  }));

  // 2. Call verifyCallback (pure CheckMacValue + RtnCode parsing)
  let verifyResult;
  try {
    const provider = getPaymentProvider("ecpay");
    verifyResult = await provider.verifyCallback({
      provider: "ecpay",
      payload,
      rawBody,
      headers: Object.fromEntries(request.headers.entries()),
    });
  } catch {
    console.log("[payment-webhook] callback error, returning 0|callback_error");
    return new Response("0|callback_error");
  }

  const pidMasked = verifyResult?.providerPaymentId
    ? "***" + verifyResult.providerPaymentId.slice(-6)
    : "(none)";
  console.log("[payment-webhook] verify result", JSON.stringify({
    paid: verifyResult?.paid,
    providerPaymentIdMasked: pidMasked,
    amountTwd: verifyResult?.amountTwd,
    rawReason: verifyResult?.raw?.reason ?? "(none)",
  }));

  // 3. If not paid — differentiate by failure reason:
  //    - CheckMacValue failure (potential forgery) → 0|... (ECPay will retry)
  //    - RtnCode !== "1" but CheckMacValue valid (genuine failure) → 1|OK (acknowledge, no retry)
  if (!verifyResult.paid) {
    const reason = (verifyResult.raw?.reason as string) || "";
    const isSignatureFailure = reason === "check_mac_value_mismatch" || reason === "missing_check_mac_value";
    if (isSignatureFailure) {
      console.log("[payment-webhook] signature failure, returning 0|" + reason);
      return new Response(`0|${reason}`);
    }
    // Genuine payment failure notification (RtnCode !== 1, missing fields, etc.)
    // Acknowledge receipt so ECPay does not keep retrying.
    console.log("[payment-webhook] genuine failure (not paid), returning 1|OK");
    return new Response("1|OK");
  }

  // ── paid:true flow ──

  // 4. Extract MerchantTradeNo (short alphanumeric ID sent to ECPay)
  const merchantTradeNo = verifyResult.raw?.merchantTradeNo as string | undefined;
  if (!merchantTradeNo) {
    console.log("[payment-webhook] missing merchantTradeNo, returning 0|missing_merchant_trade_no");
    return new Response("0|missing_merchant_trade_no");
  }

  // 5. Lookup Payment by providerPaymentId (= MerchantTradeNo)
  //    This short ID was stored on the Payment record during create-payment.
  const payment = await recordStore.getPaymentByProviderPaymentId(merchantTradeNo);
  const tnoMasked = merchantTradeNo.length > 8
    ? merchantTradeNo.slice(0, 4) + "***" + merchantTradeNo.slice(-4)
    : merchantTradeNo;
  console.log("[payment-webhook] payment lookup", JSON.stringify({
    merchantTradeNoMasked: tnoMasked,
    found: !!payment,
    paymentId: payment?.id ?? "(none)",
    paymentStatus: payment?.status ?? "(none)",
  }));
  if (!payment) {
    console.log("[payment-webhook] payment not found, returning 0|payment_not_found");
    return new Response("0|payment_not_found");
  }

  // 6. Amount match (verify TradeAmt matches our record)
  //    amountTwd must be present when paid=true (enforced by verifyCallback guard).
  if (verifyResult.amountTwd === undefined) {
    console.log("[payment-webhook] missing amount, returning 0|missing_amount");
    return new Response("0|missing_amount");
  }
  if (verifyResult.amountTwd !== payment.amountTwd) {
    console.log("[payment-webhook] amount mismatch, returning 0|amount_mismatch");
    return new Response("0|amount_mismatch");
  }

  // 7. Validate providerPaymentId (ECPay TradeNo, must not be "not_verified")
  const providerPaymentId = verifyResult.providerPaymentId;
  if (!providerPaymentId || providerPaymentId === "not_verified") {
    console.log("[payment-webhook] invalid providerPaymentId, returning 0|invalid_provider_payment_id");
    return new Response("0|invalid_provider_payment_id");
  }

  // 8. Build dedupeKey and check duplicates (with resume support)
  const dedupeKey = `ecpay:${providerPaymentId}`;

  // Persist payment confirmation with retry for transient DB errors
  const persistResponse = await withDbRetry(
    () => persistECPayPayment(payment.id, providerPaymentId, rawBody, dedupeKey),
    { maxRetries: 2, context: { merchantTradeNo: merchantTradeNo.length > 8 ? merchantTradeNo.slice(0, 4) + "***" + merchantTradeNo.slice(-4) : merchantTradeNo, paymentId: payment.id, dedupeKey: "ecpay:***" + providerPaymentId.slice(-6) } },
  );
  return persistResponse;
}

function isTransientDbError(error: unknown): boolean {
  const err = error as Record<string, unknown> | null;
  const code = typeof err?.code === "string" ? err.code : undefined;
  const name = typeof err?.name === "string" ? err.name : undefined;
  const message = typeof err?.message === "string" ? err.message : "";
  if (code === "57P01") return true;
  if (name === "DriverAdapterError") return true;
  if (message.includes("terminating connection")) return true;
  if (message.includes("57P01")) return true;
  return false;
}

async function withDbRetry<T>(fn: () => Promise<T>, options: { maxRetries: number; context: Record<string, unknown> }): Promise<T> {
  let lastError;
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error)) throw error;
      if (attempt < options.maxRetries) {
        console.warn("[payment-webhook] transient DB error, retrying", JSON.stringify({
          attempt: attempt + 1,
          maxRetries: options.maxRetries,
          errorCode: typeof error === "object" && error ? String((error as Record<string, unknown>).code ?? (error as Record<string, unknown>).name ?? "") || "unknown" : "unknown",
          ...options.context,
        }));
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function persistECPayPayment(paymentId: string, providerPaymentId: string, rawBody: string, dedupeKey: string): Promise<Response> {
  const existing = await recordStore.getPaymentWebhookLogByDedupeKey(dedupeKey);
  const currentPayment = await recordStore.getPayment(paymentId);

  if (existing) {
    if (existing.processed && currentPayment && currentPayment.status === "paid") {
      console.log("[payment-webhook] dedupe: already processed, payment paid, returning 1|OK");
      return new Response("1|OK");
    }

    if (existing.processed && (!currentPayment || currentPayment.status !== "paid")) {
      console.error("[payment-webhook] state mismatch", JSON.stringify({
        step: "dedupe_check",
        paymentId,
        paymentStatus: (currentPayment && currentPayment.status) || "(not_found)",
        dedupeKey: "ecpay:***" + providerPaymentId.slice(-6),
        logId: existing.id,
        logVerified: existing.verified,
        logProcessed: existing.processed,
        logErrorMessage: existing.errorMessage || null,
      }));
      return new Response("0|state_mismatch");
    }

    if (!existing.processed && currentPayment && currentPayment.status === "paid") {
      console.log("[payment-webhook] dedupe: payment already paid, fixing log");
      await recordStore.markPaymentWebhookLogProcessed(existing.id);
      return new Response("1|OK");
    }

    // Case D: Resume from where we left off
    console.log("[payment-webhook] dedupe: existing log found, resuming from verification");

    if (!existing.verified) {
      await recordStore.updatePaymentWebhookLogVerification(existing.id, {
        verified: true,
        signatureValid: true,
        amountMatch: true,
      });
    }

    const updatedPayment = await recordStore.confirmPaymentByWebhook(paymentId, {
      providerPaymentId,
      providerName: "ecpay",
    });

    if (!updatedPayment) {
      await recordStore.markPaymentWebhookLogProcessed(existing.id, {
        errorMessage: "payment already processed",
      });
      return new Response("1|OK");
    }

    await recordStore.markPaymentWebhookLogProcessed(existing.id);
    console.log("[payment-webhook] resume success, returning 1|OK");
    return new Response("1|OK");
  }

  // No existing log - normal flow
  const log = await recordStore.createPaymentWebhookLog({
    paymentId,
    providerName: "ecpay",
    providerPaymentId,
    dedupeKey,
    eventType: "payment_paid",
    rawPayload: rawBody,
  });

  await recordStore.updatePaymentWebhookLogVerification(log.id, {
    verified: true,
    signatureValid: true,
    amountMatch: true,
  });

  console.log("[payment-webhook] calling confirmPaymentByWebhook...");
  const updatedPayment = await recordStore.confirmPaymentByWebhook(paymentId, {
    providerPaymentId,
    providerName: "ecpay",
  });
  console.log("[payment-webhook] confirmPayment result:", !!updatedPayment);

  if (!updatedPayment) {
    await recordStore.markPaymentWebhookLogProcessed(log.id, {
      errorMessage: "payment already processed",
    });
    return new Response("1|OK");
  }

  await recordStore.markPaymentWebhookLogProcessed(log.id);
  console.log("[payment-webhook] success, returning 1|OK");
  return new Response("1|OK");
}

