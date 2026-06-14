import { recordStore } from "@/lib/record-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const VALID_FEEDBACK = ["準", "普通", "不準"] as const;

export async function POST(request: Request) {
  // ─── Rate limiting ───
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, 30, 10 * 60 * 1000);
  if (!limit.allowed) {
    return Response.json(
      { error: "rate_limited", message: "請稍後再試。" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }
  try {
    const body = await request.json();
    const { analysisId, paymentId, feedback } = body as {
      analysisId: string;
      paymentId: string;
      feedback: string;
    };

    if (!analysisId) {
      return Response.json({ error: "缺少判定編號。" }, { status: 400 });
    }
    if (!paymentId) {
      return Response.json({ error: "缺少付款編號。" }, { status: 400 });
    }
    if (!feedback || !VALID_FEEDBACK.includes(feedback as typeof VALID_FEEDBACK[number])) {
      return Response.json({ error: "請提供有效的回饋（準 / 普通 / 不準）。" }, { status: 400 });
    }

    const saved = await recordStore.saveFeedback(analysisId, paymentId, feedback);

    console.log(`[Feedback] saved — id=${saved.id} analysisId=${saved.analysisId} value=${saved.value}`);

    return Response.json({ status: "ok", id: saved.id });
  } catch (err) {
    console.error("Feedback error:", err);
    return Response.json({ error: "伺服器發生錯誤。" }, { status: 500 });
  }
}
