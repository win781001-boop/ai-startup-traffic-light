import { recordStore } from "@/lib/record-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getPaymentProvider } from "@/lib/payments";
import { FIRST_REPORT_PRICE_TWD } from "@/lib/pricing";

export interface CreatePaymentResponse {
  payment: { id: string; status: string; used: boolean; usedAt: string | null; createdAt: string; paidAt: string | null };
  analysisId: string;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return Response.json(
      { error: "rate_limited", message: "請稍後再試。" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const amountTwd = FIRST_REPORT_PRICE_TWD;
  const provider = getPaymentProvider("mock");
  const providerResult = await provider.createPayment({
    amountTwd,
    description: "AI創業紅綠燈 首次完整報告",
  });

  const { payment, analysis } = await recordStore.createPayment(amountTwd, {
    providerName: providerResult.provider,
    providerPaymentId: providerResult.providerPaymentId,
    providerRawResponse: JSON.stringify(providerResult.raw ?? providerResult),
  });

  // Whitelist only the fields safe for the client — do not expose internal provider fields.
  const { amountTwd: _amt, providerName, providerPaymentId, providerRawResponse, ...safePayment } = payment;
  return Response.json({ payment: safePayment, analysisId: analysis.id });
}
