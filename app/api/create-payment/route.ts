import { recordStore } from "@/lib/record-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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

  const { payment, analysis } = await recordStore.createPayment();
  return Response.json({ payment, analysisId: analysis.id });
}
