import { recordStore } from "@/lib/record-store";

export interface CreatePaymentResponse {
  payment: { id: string; status: string; used: boolean; usedAt: string | null; createdAt: string; paidAt: string | null };
  analysisId: string;
}

export async function POST() {
  const { payment, analysis } = await recordStore.createPayment();
  return Response.json({ payment, analysisId: analysis.id });
}
