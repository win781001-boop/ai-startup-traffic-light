import { recordStore } from "@/lib/record-store";

export async function POST(request: Request) {
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
