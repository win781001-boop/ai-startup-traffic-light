export interface FeedbackInput {
  feedback: "準" | "普通" | "不準";
}

const VALID_FEEDBACK = ["準", "普通", "不準"] as const;

export async function POST(request: Request) {
  try {
    const body: FeedbackInput = await request.json();

    if (!body.feedback || !VALID_FEEDBACK.includes(body.feedback as typeof VALID_FEEDBACK[number])) {
      return Response.json(
        { error: "請提供有效的回饋（準 / 普通 / 不準）。" },
        { status: 400 }
      );
    }

    // TODO: v0.3 — 暫用 console.log 記錄，未來可接分析服務
    console.log(`[Feedback] 判定回饋：${body.feedback} — ${new Date().toISOString()}`);

    return Response.json({ status: "ok" });
  } catch (err) {
    console.error("Feedback error:", err);
    return Response.json(
      { error: "伺服器發生錯誤。" },
      { status: 500 }
    );
  }
}
