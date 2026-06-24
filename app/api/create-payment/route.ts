import { recordStore } from "@/lib/record-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getPaymentProvider } from "@/lib/payments";
import { FIRST_REPORT_PRICE_TWD } from "@/lib/pricing";

/**
 * POST /api/create-payment
 *
 * Creates a payment order. Provider selection depends on PAYMENT_PROVIDER env:
 *   - "newebpay" → uses NewebPay MPG, returns formHtml
 *   - "ecpay"    → uses ECPay AioCheckOut V5, returns formHtml
 *   - unset / "mock" → uses mock provider (existing behavior, no formHtml)
 *
 * Real provider flow (newebpay / ecpay):
 *   1. Create Payment record (pending) with auto-generated paymentId
 *   2. Call provider.createPayment() with paymentId as merchantOrderNo
 *   3. Return formHtml so the frontend can redirect
 *
 * Mock flow (unchanged):
 *   1. Call mockProvider.createPayment()
 *   2. Create Payment + Analysis records
 *   3. Return safe payment fields
 */

export interface CreatePaymentResponse {
  payment: {
    id: string;
    status: string;
    used: boolean;
    usedAt: string | null;
    createdAt: string;
    paidAt: string | null;
  };
  analysisId: string;
  /** Present only when PAYMENT_PROVIDER=newebpay or ecpay. */
  formHtml?: string;
}

/**
 * Derive the application base URL for constructing NotifyURL / ReturnURL.
 *
 * Priority:
 *   1. APP_BASE_URL (explicit env var)
 *   2. VERCEL_URL / VERCEL_BRANCH_URL (Vercel deployment, needs https:// prefix)
 *   3. http://localhost:3000 (local dev fallback)
 */
function getBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.VERCEL_BRANCH_URL) return `https://${process.env.VERCEL_BRANCH_URL}`;
  return "http://localhost:3000";
}

/** Real payment provider names that use formHtml. */
const REAL_PROVIDERS = ["newebpay", "ecpay"] as const;
type RealProvider = (typeof REAL_PROVIDERS)[number];

export async function POST(request: Request) {
  console.log("[create-payment] PAYMENT_PROVIDER env:", process.env.PAYMENT_PROVIDER);
  console.log("[create-payment] NODE_ENV:", process.env.NODE_ENV);
  console.log("[create-payment] APP_BASE_URL env:", process.env.APP_BASE_URL);

  const ip = getClientIp(request);
  const limit = await checkRateLimit(ip, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return Response.json(
      { error: "rate_limited", message: "請稍後再試。" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const amountTwd = FIRST_REPORT_PRICE_TWD;
  const rawProvider = process.env.PAYMENT_PROVIDER;
  const providerName: RealProvider | "mock" =
    REAL_PROVIDERS.includes(rawProvider as RealProvider) ? (rawProvider as RealProvider) : "mock";
  console.log("[create-payment] resolved providerName:", providerName);

  if (providerName !== "mock") {
    // ─── Real provider flow (newebpay / ecpay) ───
    // 1. Create Payment + Analysis records first (gets auto-generated IDs)
    const { payment, analysis } = await recordStore.createPayment(amountTwd, {
      providerName,
    });

    // 2. Call provider with paymentId as merchantOrderNo
    const baseUrl = getBaseUrl();
    const provider = getPaymentProvider(providerName);
    const providerResult = await provider.createPayment({
      amountTwd,
      description: "AI創業紅綠燈 首次完整報告",
      merchantOrderNo: payment.id,
      notifyUrl: `${baseUrl}/api/payment-webhook`,
      returnUrl: `${baseUrl}/payment/result?paymentId=${payment.id}&analysisId=${analysis.id}`,
    });

    // 3. Store providerPaymentId on Payment record for callback lookup.
    //    providerPaymentId is the short MerchantTradeNo sent to ECPay.
    //    It's written now (before callback arrives) so the webhook handler
    //    can find this Payment by MerchantTradeNo when ECPay calls us back.
    await recordStore.updatePaymentProviderData(payment.id, {
      providerPaymentId: providerResult.providerPaymentId,
      providerRawResponse: JSON.stringify(providerResult.raw ?? {}),
    });

    // 4. Whitelist safe fields — never expose HashKey/HashIV/CheckMacValue to client
    const { amountTwd: _amt, providerName: _pn, providerPaymentId, providerRawResponse, ...safePayment } = payment;
    console.log("[create-payment] REAL PROVIDER: returning formHtml?", !!providerResult.formHtml, "provider:", providerResult.provider);
    return Response.json({
      payment: safePayment,
      analysisId: analysis.id,
      formHtml: providerResult.formHtml,
    });
  }

  // ─── Mock flow (unchanged) ───
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
  const { amountTwd: _amt, providerName: _pn2, providerPaymentId, providerRawResponse, ...safePayment } = payment;
  return Response.json({ payment: safePayment, analysisId: analysis.id });
}

