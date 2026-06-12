import { recordStore } from "@/lib/record-store";

/**
 * Phase 3B — Mock webhook endpoint.
 *
 * 接收金流 provider 的付款通知，進行 mock 簽章驗證與金額核對，
 * 僅在驗證通過 + 金額相符時才將 Payment.status 從 pending 改為 paid。
 *
 * 所有情境（含錯誤）皆回傳 200，避免金流端重送。
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
  /**
   * ─── Production guard ───
   * In production, this mock endpoint MUST NOT be reachable.
   * Returning 404 prevents external callers from bypassing real payment flow.
   */
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  // 1. 解析 JSON
  let payload: PaymentWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  // 驗證必要欄位
  if (!payload.providerName || !payload.eventType || payload.amountTwd === undefined || !payload.signature) {
    return Response.json({ ok: false, error: "missing required fields" }, { status: 400 });
  }

  const { providerName, providerEventId, providerPaymentId, paymentId, eventType, amountTwd, signature } = payload;

  // 2. 保存原始 payload
  const rawPayload = JSON.stringify(payload);

  // 3. 建立 dedupeKey
  let dedupeKey: string;
  if (providerEventId) {
    dedupeKey = `${providerName}:${providerEventId}`;
  } else if (providerPaymentId) {
    dedupeKey = `${providerName}:${providerPaymentId}:${eventType}`;
  } else {
    return Response.json({ ok: false, error: "cannot build dedupe key" }, { status: 400 });
  }

  // 4. 重複檢查 — 已存在同一個 dedupeKey 則直接回 200
  const existing = await recordStore.getPaymentWebhookLogByDedupeKey(dedupeKey);
  if (existing) {
    return Response.json({ ok: true, duplicated: true });
  }

  // 5. 寫入 PaymentWebhookLog
  const log = await recordStore.createPaymentWebhookLog({
    paymentId: paymentId ?? null,
    providerName,
    providerEventId: providerEventId ?? null,
    providerPaymentId: providerPaymentId ?? null,
    dedupeKey,
    eventType,
    rawPayload,
  });

  // 6. Mock 簽章驗證
  const signatureValid = signature === "mock-valid";

  // 7. 查詢 Payment
  let payment = null;
  if (paymentId) {
    payment = await recordStore.getPayment(paymentId);
  }

  // ── 情境 1：Payment 不存在 ──
  if (!paymentId || !payment) {
    await recordStore.updatePaymentWebhookLogVerification(log.id, {
      verified: true,
      signatureValid,
      errorMessage: "payment not found",
    });
    await recordStore.markPaymentWebhookLogProcessed(log.id, { errorMessage: "payment not found" });
    return Response.json({ ok: true, processed: false, reason: "payment_not_found" });
  }

  // ── 情境 2：簽章無效 ──
  if (!signatureValid) {
    await recordStore.updatePaymentWebhookLogVerification(log.id, {
      verified: true,
      signatureValid: false,
      errorMessage: "invalid signature",
    });
    await recordStore.markPaymentWebhookLogProcessed(log.id, { errorMessage: "invalid signature" });
    return Response.json({ ok: true, processed: false, reason: "invalid_signature" });
  }

  // ── 情境 3：金額不符 ──
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

  // ── 情境 4：簽章有效 + 金額相符 — 更新 Payment ──
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
    // Payment 可能已被 webhook 或 confirm-payment 先更新
    await recordStore.markPaymentWebhookLogProcessed(log.id, { errorMessage: "payment already processed" });
    return Response.json({ ok: true, processed: false, reason: "payment_already_processed" });
  }

  await recordStore.markPaymentWebhookLogProcessed(log.id);
  return Response.json({ ok: true, processed: true });
}
