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
  // 1. Parse form-urlencoded body
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return new Response("0|content_type_error");
  }

  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);
  const payload: Record<string, unknown> = Object.fromEntries(params.entries());

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
    return new Response("0|callback_error");
  }

  // 3. If not paid — differentiate by failure reason:
  //    - CheckMacValue failure (potential forgery) → 0|... (ECPay will retry)
  //    - RtnCode !== "1" but CheckMacValue valid (genuine failure) → 1|OK (acknowledge, no retry)
  if (!verifyResult.paid) {
    const reason = (verifyResult.raw?.reason as string) || "";
    const isSignatureFailure = reason === "check_mac_value_mismatch" || reason === "missing_check_mac_value";
    if (isSignatureFailure) {
      return new Response(`0|${reason}`);
    }
    // Genuine payment failure notification (RtnCode !== 1, missing fields, etc.)
    // Acknowledge receipt so ECPay does not keep retrying.
    return new Response("1|OK");
  }

  // ── paid:true flow ──

  // 4. Extract MerchantTradeNo (short alphanumeric ID sent to ECPay)
  const merchantTradeNo = verifyResult.raw?.merchantTradeNo as string | undefined;
  if (!merchantTradeNo) {
    return new Response("0|missing_merchant_trade_no");
  }

  // 5. Lookup Payment by providerPaymentId (= MerchantTradeNo)
  //    This short ID was stored on the Payment record during create-payment.
  const payment = await recordStore.getPaymentByProviderPaymentId(merchantTradeNo);
  if (!payment) {
    return new Response("0|payment_not_found");
  }

  // 6. Amount match (verify TradeAmt matches our record)
  //    amountTwd must be present when paid=true (enforced by verifyCallback guard).
  if (verifyResult.amountTwd === undefined) {
    return new Response("0|missing_amount");
  }
  if (verifyResult.amountTwd !== payment.amountTwd) {
    return new Response("0|amount_mismatch");
  }

  // 7. Validate providerPaymentId (ECPay TradeNo, must not be "not_verified")
  const providerPaymentId = verifyResult.providerPaymentId;
  if (!providerPaymentId || providerPaymentId === "not_verified") {
    return new Response("0|invalid_provider_payment_id");
  }

  // 8. Build dedupeKey and check duplicates
  const dedupeKey = `ecpay:${providerPaymentId}`;
  const existing = await recordStore.getPaymentWebhookLogByDedupeKey(dedupeKey);
  if (existing) {
    // Already processed — acknowledge to prevent retries
    return new Response("1|OK");
  }

  // 9. Create PaymentWebhookLog
  let log;
  try {
    log = await recordStore.createPaymentWebhookLog({
      paymentId: payment.id,
      providerName: "ecpay",
      providerPaymentId,
      dedupeKey,
      eventType: "payment_paid",
      rawPayload: rawBody,
    });
  } catch {
    return new Response("0|log_failed");
  }

  // 10. Update verification (signature + amount already checked)
  await recordStore.updatePaymentWebhookLogVerification(log.id, {
    verified: true,
    signatureValid: true,
    amountMatch: true,
  });

  // 11. Confirm payment (safe: only updates if status === "pending")
  const updatedPayment = await recordStore.confirmPaymentByWebhook(payment.id, {
    providerPaymentId,
    providerName: "ecpay",
  });

  if (!updatedPayment) {
    await recordStore.markPaymentWebhookLogProcessed(log.id, {
      errorMessage: "payment already processed",
    });
    return new Response("1|OK");
  }

  // 12. Mark success and acknowledge
  await recordStore.markPaymentWebhookLogProcessed(log.id);
  return new Response("1|OK");
}

