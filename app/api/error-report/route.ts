import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// ─── Allowed issue types ───
const ALLOWED_ISSUE_TYPES = [
  "付款後沒有正常產生結果",
  "下載報告無法開啟",
  "判定內容出現亂碼或格式錯誤",
  "判定結果頁顯示異常",
  "我已付款但系統顯示未付款",
  "其他系統錯誤",
] as const;

// ─── Allowed screenshot MIME types ───
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ─── Basic email regex ───
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  // ─── Rate limiting ───
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return Response.json(
      { error: "rate_limited", message: "請稍後再試。" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }
  try {
    const formData = await request.formData();

    // 1. Extract fields
    const analysisId = formData.get("analysisId") as string | null;
    const paymentId = formData.get("paymentId") as string | null;
    const issueType = formData.get("issueType") as string | null;
    const email = formData.get("email") as string | null;
    const screenshot = formData.get("screenshot") as File | null;

    // 2. Required field checks
    if (!analysisId) return Response.json({ error: "缺少 analysisId。" }, { status: 400 });
    if (!paymentId) return Response.json({ error: "缺少 paymentId。" }, { status: 400 });
    if (!issueType) return Response.json({ error: "缺少 issueType。" }, { status: 400 });
    if (!email) return Response.json({ error: "缺少 email。" }, { status: 400 });
    if (!screenshot) return Response.json({ error: "缺少 screenshot。" }, { status: 400 });

    // 3. Validate issueType
    if (!ALLOWED_ISSUE_TYPES.includes(issueType as any)) {
      return Response.json({ error: "不支援的問題類型。" }, { status: 400 });
    }

    // 4. Validate email format
    if (!EMAIL_RE.test(email)) {
      return Response.json({ error: "Email 格式不正確。" }, { status: 400 });
    }

    // 5. Validate screenshot MIME type
    if (!ALLOWED_MIME_TYPES.includes(screenshot.type)) {
      return Response.json({ error: "不支援的圖片格式，僅接受 jpg / png / webp。" }, { status: 400, statusText: "invalid_file_type" });
    }

    // 6. Validate screenshot size
    if (screenshot.size > MAX_FILE_SIZE) {
      return Response.json({ error: "圖片大小不可超過 5MB。" }, { status: 400, statusText: "file_too_large" });
    }

    // 7. Check duplicate — same paymentId can only have one error report
    const existing = await prisma.errorReport.findUnique({ where: { paymentId } });
    if (existing) {
      return Response.json({ error: "此付款編號已送出問題回報。" }, { status: 409, statusText: "duplicate_error_report" });
    }

    // TODO: 正式金流前需接正式圖片儲存服務（S3 / R2 / Cloudinary）。
    // 目前先以 placeholder 佔位。
    const screenshotUrl = "pending-storage";

    // 8. Create ErrorReport record
    await prisma.errorReport.create({
      data: {
        analysisId,
        paymentId,
        issueType,
        email,
        screenshotUrl,
        screenshotMimeType: screenshot.type,
        screenshotSizeBytes: screenshot.size,
      },
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[error-report] Unexpected:", err);
    return Response.json({ error: "伺服器發生錯誤，請稍後再試。" }, { status: 500 });
  }
}
