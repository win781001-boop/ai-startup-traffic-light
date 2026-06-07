import { recordStore } from "@/lib/record-store";
import type { Payment } from "@/lib/types";

export interface CreatePaymentResponse {
  payment: Payment;
}

export async function POST() {
  const payment = recordStore.createPayment();
  return Response.json({ payment } satisfies CreatePaymentResponse);
}
