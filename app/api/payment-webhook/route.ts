import { recordStore } from "@/lib/record-store";
import { getPaymentProvider } from "@/lib/payments";

/**
 * Phase 3N-R-B — Mock webhook + NewebPay NotifyURL route.
 *
 * Content-Type routing:
 *   application/json: mock webhook (dev/test only)
 *   application/x-www-form-urlencoded: NewebPay NotifyURL callback
 *
 * NewebPay flow:
 *   - parse form-urlencoded → call newebpayProvider.verifyCallback()
 *   - paid:true → lookup Payment by merchantOrderNo, compare amountTwd,
 *     create PaymentWebhookLog with dedupeKey=newebpay:{TradeNo},
 *     then confirmPaymentByWebhook()
 *   - paid:false → return reason, do NOT update Payment
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

  // ═══════════════════════════════════════════════════════════
  // Mock provider branch (existing behavior preserved)
  // ═══════════════════════════════════════════════════════════
  if (!paymentProvider || paymentProvider === "mock") {
    return handleMockWebhook(request);
  }

  // ═══════════════════════════════════════════════════════════
  // NewebPay provider branch
  // ═══════════════════════════════════════════════════════════
  if (paymentProvider === "newebpay") {
    return handleNewebPayWebhook(request);
  }

  // Unknown provider — reject safely
  return new Response(null, { status: 404 });
}

// ─── Mock webhook handler ───

async function handleMockWebhook(request: Request): Promise<Response> {
  /**
   * Production guard — mock endpoint MUST NOT be reachable in production.
   */
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  // 1. Parse JSON
  let payload: PaymentWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  // Validate required fields
  if (!payload.providerName || !payload.eventType || payload.amountTwd === undefined || !payload.signature) {
    return Response.json({ ok: false, error: "missing required fields" }, { status: 400 });
  }

  const { providerName, providerEventId, providerPaymentId, paymentId, eventType, amountTwd, signature } = payload;

  // 2. Save raw payload
  const rawPayload = JSON.stringify(payload);

  // 3. Build dedupeKey
  let dedupeKey: string;
  if (providerEventId) {
    dedupeKey = `${providerName}:${providerEventId}`;
  } else if (providerPaymentId) {
    dedupeKey = `${providerName}:${providerPaymentId}:${eventType}`;
  } else {
    return Response.json({ ok: false, error: "cannot build dedupe key" }, { status: 400 });
  }

  // 4. Duplicate check
  const existing = await recordStore.getPaymentWebhookLogByDedupeKey(dedupeKey);
  if (existing) {
    return Response.json({ ok: true, duplicated: true });
  }

  // 5. Create PaymentWebhookLog
  const log = await recordStore.createPaymentWebhookLog({
    paymentId: paymentId ?? null,
    providerName,
    providerEventId: providerEventId ?? null,
    providerPaymentId: providerPaymentId ?? null,
    dedupeKey,
    eventType,
    rawPayload,
  });

  // 6. Mock signature validation
  const signatureValid = signature === "mock-valid";

  // 7. Lookup Payment
  let payment = null;
  if (paymentId) {
    payment = await recordStore.getPayment(paymentId);
  }

  // ── Case 1: Payment not found ──
  if (!paymentId || !payment) {
    await recordStore.updatePaymentWebhookLogVerification(log.id, {
      verified: true,
      signatureValid,
      errorMessage: "payment not found",
    });
    await recordStore.markPaymentWebhookLogProcessed(log.id, { errorMessage: "payment not found" });
    return Response.json({ ok: true, processed: false, reason: "payment_not_found" });
  }

  // ── Case 2: Invalid signature ──
  if (!signatureValid) {
    await recordStore.updatePaymentWebhookLogVerification(log.id, {
      verified: true,
      signatureValid: false,
      errorMessage: "invalid signature",
    });
    await recordStore.markPaymentWebhookLogProcessed(log.id, { errorMessage: "invalid signature" });
    return Response.json({ ok: true, processed: false, reason: "invalid_signature" });
  }

  // ── Case 3: Amount mismatch ──
  const amountMatch = payment.amountTwd === amountTwd;
  if (!amountMatch) {
    await recordStore.updatePaymentWebhookLogVerification(log.id, {
      verified: true,
      signatureValid: true,
      amountMatch: false,
      errorMessage: "amount mismatch",
    });
    await recordStore.markPaymentWebhookLogProcessed(log.id, { errorMessage: "amount mismatch" });
    return Response.json({ ok: true, processed: false, reason: "amount_mismatch" });
  }

  // ── Case 4: Valid signature + amount match — update Payment ──
  await recordStore.updatePaymentWebhookLogVerification(log.id, {
    verified: true,
    signatureValid: true,
    amountMatch: true,
  });

  const updatedPayment = await recordStore.confirmPaymentByWebhook(paymentId!, {
    providerPaymentId: providerPaymentId ?? paymentId,
    providerName,
  });

  if (!updatedPayment) {
    await recordStore.markPaymentWebhookLogProcessed(log.id, { errorMessage: "payment already processed" });
    return Response.json({ ok: true, processed: false, reason: "payment_already_processed" });
  }

  await recordStore.markPaymentWebhookLogProcessed(log.id);
  return Response.json({ ok: true, processed: true });
}

// ─── NewebPay NotifyURL handler ───

async function handleNewebPayWebhook(request: Request): Promise<Response> {
  // 1. Determine content type and parse body
  const contentType = request.headers.get("content-type") ?? "";
  const isFormUrlEncoded = contentType.includes("application/x-www-form-urlencoded");

  let payload: Record<string, unknown>;
  let rawBody: string;

  if (isFormUrlEncoded) {
    rawBody = await request.text();
    const params = new URLSearchParams(rawBody);
    payload = Object.fromEntries(params.entries());
  } else {
    // Not form-urlencoded — reject for newebpay
    return Response.json({ ok: false, error: "newebpay requires application/x-www-form-urlencoded" }, { status: 400 });
  }

  // 2. Call verifyCallback (pure parsing + signature validation)
  let verifyResult;
  try {
    const provider = getPaymentProvider("newebpay");
    verifyResult = await provider.verifyCallback({
      provider: "newebpay",
      payload,
      rawBody,
      headers: Object.fromEntries(request.headers.entries()),
    });
  } catch {
    // verifyCallback should not throw, but guard just in case
    return Response.json({ ok: true, processed: false, reason: "callback_error" });
  }

  // 3. Handle non-paid callback
  if (!verifyResult.paid) {
    const reason = (verifyResult.raw?.reason as string) || "not_paid";

    // Try to create a log for non-success callbacks if we have a dedupeKey
    const logDedupeKey = buildNewebPayDedupeKey(
      verifyResult.providerPaymentId,
      verifyResult.raw?.merchantOrderNo as string | undefined,
      verifyResult.raw?.status as string | undefined,
    );

    if (logDedupeKey) {
      const existing = await recordStore.getPaymentWebhookLogByDedupeKey(logDedupeKey);
      if (!existing) {
        try {
          await recordStore.createPaymentWebhookLog({
            dedupeKey: logDedupeKey,
            providerName: "newebpay",
            providerPaymentId: verifyResult.providerPaymentId !== "not_verified" ? verifyResult.providerPaymentId : null,
            rawPayload: rawBody,
            eventType: "payment_callback",
          });
        } catch {
          // Log creation failure is non-fatal for non-paid callbacks
        }
      }
    }

    return Response.json({ ok: true, processed: false, reason });
  }

  // ── paid:true flow ──

  // 4. Extract paymentId from merchantOrderNo
  const paymentId = verifyResult.raw?.merchantOrderNo as string | undefined;
  if (!paymentId) {
    return Response.json({ ok: true, processed: false, reason: "missing_payment_id" });
  }

  // 5. Lookup Payment by merchantOrderNo (= paymentId)
  const payment = await recordStore.getPayment(paymentId);
  if (!payment) {
    return Response.json({ ok: true, processed: false, reason: "payment_not_found" });
  }

  // 6. Amount match
  if (verifyResult.amountTwd !== undefined && verifyResult.amountTwd !== payment.amountTwd) {
    return Response.json({ ok: true, processed: false, reason: "amount_mismatch" });
  }

  // 7. Validate providerPaymentId (must be a real TradeNo, not "not_verified")
  const providerPaymentId = verifyResult.providerPaymentId;
  if (!providerPaymentId || providerPaymentId === "not_verified") {
    return Response.json({ ok: true, processed: false, reason: "invalid_provider_payment_id" });
  }

  // 8. Build dedupeKey and check duplicates
  const dedupeKey = `newebpay:${providerPaymentId}`;
  const existing = await recordStore.getPaymentWebhookLogByDedupeKey(dedupeKey);
  if (existing) {
    return Response.json({ ok: true, duplicated: true, processed: false });
  }

  // 9. Create PaymentWebhookLog
  let log;
  try {
    log = await recordStore.createPaymentWebhookLog({
      paymentId,
      providerName: "newebpay",
      providerPaymentId,
      dedupeKey,
      eventType: "payment_paid",
      rawPayload: rawBody,
    });
  } catch {
    return Response.json({ ok: true, processed: false, reason: "log_failed" });
  }

  // 10. Update verification (signature + amount already checked)
  await recordStore.updatePaymentWebhookLogVerification(log.id, {
    verified: true,
    signatureValid: true,
    amountMatch: true,
  });

  // 11. Confirm payment (safe: only updates if status === "pending")
  const updatedPayment = await recordStore.confirmPaymentByWebhook(paymentId, {
    providerPaymentId,
    providerName: "newebpay",
  });

  if (!updatedPayment) {
    await recordStore.markPaymentWebhookLogProcessed(log.id, { errorMessage: "payment already processed" });
    return Response.json({ ok: true, processed: false, reason: "payment_already_processed" });
  }

  // 12. Mark success and return
  await recordStore.markPaymentWebhookLogProcessed(log.id);
  return Response.json({ ok: true, processed: true });
}

/**
 * Build a dedupeKey for NewebPay callbacks.
 * Priority: TradeNo > TradeNo+Status > MerchantOrderNo+Status > null
 */
function buildNewebPayDedupeKey(
  providerPaymentId: string,
  merchantOrderNo: string | undefined,
  status: string | undefined,
): string | null {
  if (providerPaymentId && providerPaymentId !== "not_verified") {
    if (status) {
      return `newebpay:${providerPaymentId}:${status}`;
    }
    return `newebpay:${providerPaymentId}`;
  }
  if (merchantOrderNo && status) {
    return `newebpay:${merchantOrderNo}:${status}`;
  }
  return null;
}


