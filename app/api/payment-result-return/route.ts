import { NextResponse } from "next/server";

/**
 * POST /api/payment-result-return
 *
 * ECPay OrderResultURL endpoint.
 *
 * After the customer completes payment on ECPay, their browser is POSTed here
 * via a hidden form. This handler does NOT verify payment, check signature,
 * or update any Payment status. It simply redirects the browser to the
 * client-side result page so it can start polling /api/payment-status.
 *
 * Safety:
 *  - No DB access (no recordStore calls)
 *  - No CheckMacValue verification (the server-to-server webhook handles that)
 *  - No payment status changes (no confirmPayment / confirmPaymentByWebhook)
 *  - On missing paymentId, redirects to "/" — never to an external URL
 *  - Redirect is 303 (See Other), which converts the POST into a GET
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("paymentId");
  const analysisId = url.searchParams.get("analysisId");

  if (!paymentId) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  const target = new URL("/payment/result", request.url);
  target.searchParams.set("paymentId", paymentId);
  if (analysisId) {
    target.searchParams.set("analysisId", analysisId);
  }

  return NextResponse.redirect(target, 303);
}
