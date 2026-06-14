import { recordStore } from "@/lib/record-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  /**
   * ─── Production guard ───
   * In production, this mock-only endpoint MUST NOT be reachable.
   * Returning 404 prevents external callers from bypassing real payment flow.
   */
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  /**
   * ─── Provider guard ───
   * Only allow direct confirm-payment when using the mock payment provider.
   * When a real payment provider is configured, payment confirmation must
   * go through the payment-webhook endpoint instead.
   */
  const paymentProvider = process.env.PAYMENT_PROVIDER;
  if (paymentProvider && paymentProvider !== "mock") {
    return new Response(null, { status: 404 });
  }

  // ─── Rate limiting ───
  const ip = getClientIp(request);
  const limit = await checkRateLimit(ip, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return Response.json(
      { error: "rate_limited", message: "請稍後再試。" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  try {
    const body = await request.json();
    const { paymentId } = body as { paymentId: string };

    if (!paymentId) {
      return Response.json({ error: "缺少付款編號。" }, { status: 400 });
    }

    const payment = await recordStore.getPayment(paymentId);
    if (!payment) {
      return Response.json({ error: "付款不存在。" }, { status: 404 });
    }
    if (payment.status !== "pending") {
      return Response.json({ error: "此付款無法再次確認。" }, { status: 400 });
    }

    const confirmed = await recordStore.confirmPayment(paymentId);
    if (!confirmed) {
      return Response.json({ error: "付款確認失敗。" }, { status: 500 });
    }

    return Response.json({ payment: confirmed });
  } catch (err) {
    console.error("[confirm-payment] Unexpected:", err);
    return Response.json({ error: "伺服器錯誤。" }, { status: 500 });
  }
}
