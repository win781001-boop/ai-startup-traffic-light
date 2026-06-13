import { recordStore } from "@/lib/record-store";

/**
 * GET /api/payment-status?paymentId=xxx
 *
 * Read-only payment status lookup.
 * Does NOT update Payment.status.
 * Does NOT call confirmPaymentByWebhook.
 * Does NOT rely on ReturnURL for payment confirmation.
 *
 * Safe response — no providerRawResponse, no webhook payload,
 * no TradeInfo/TradeSha, no card info, no HashKey/HashIV.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("paymentId");

  if (!paymentId) {
    return Response.json({ error: "缺少付款編號" }, { status: 400 });
  }

  const payment = await recordStore.getPayment(paymentId);
  if (!payment) {
    return Response.json({ error: "付款不存在" }, { status: 404 });
  }

  // Look up the associated analysis to include analysisId
  let analysisId: string | null = null;
  try {
    const analysis = await recordStore.getAnalysisByPaymentId(paymentId);
    if (analysis) {
      analysisId = analysis.id;
    }
  } catch {
    // analysis lookup failure is non-fatal for status check
  }

  // Whitelist only safe, public-facing fields
  return Response.json({
    paymentId: payment.id,
    status: payment.status,
    paidAt: payment.paidAt,
    amountTwd: payment.amountTwd,
    analysisId,
  });
}
