// ─── Payment Provider Abstraction Types ───
// Phase 2: real-payment-ready types (formHtml, notifyUrl, returnUrl added).

/** Supported payment provider names. */
export type PaymentProviderName = "mock" | "newebpay" | "ecpay" | "linepay";

/** Input for creating a payment order. */
export interface CreatePaymentInput {
  /** Payment amount in TWD (e.g. 49 for first report). */
  amountTwd: number;
  /** Human-readable item description (e.g. "AI創業紅綠燈 首次完整報告"). */
  description: string;
  /** Optional customer email for payment receipt. */
  customerEmail?: string;
  /** Merchant-side order number (maps to our paymentId). Required by some providers. */
  merchantOrderNo?: string;

  /** Asynchronous callback URL (provider sends webhook to this URL after payment). */
  notifyUrl?: string;
  /** Synchronous redirect URL (customer is redirected here after completing payment). */
  returnUrl?: string;

  /** Optional metadata passed through to the provider (stored in raw response). */
  metadata?: Record<string, unknown>;
}

/** Result from creating a payment order. */
export interface CreatePaymentResult {
  /** The provider that handled this payment. */
  provider: PaymentProviderName;
  /** Provider-side payment order ID. */
  providerPaymentId: string;
  /** Order status after creation. */
  status: "created" | "pending" | "failed";

  /**
   * URL for redirect-based payment providers (e.g. LINE Pay, PayPal).
   * The customer is redirected to this URL to complete payment.
   * Null for form-based providers (ECPay) or mock.
   */
  paymentUrl: string | null;

  /**
   * HTML form string for form-POST-based payment providers (e.g. ECPay).
   * The frontend renders this as a hidden form and auto-submits it.
   * Undefined for redirect-based providers or mock.
   */
  formHtml?: string;

  /**
   * Alternative redirect URL for providers that distinguish between
   * payment page URL and post-payment redirect.
   * Undefined if not applicable.
   */
  redirectUrl?: string;

  /** Raw provider response for debugging / record-keeping. */
  raw?: Record<string, unknown>;
}

/** Input for verifying a payment callback / webhook. */
export interface VerifyPaymentCallbackInput {
  /** The provider that sent the callback. */
  provider: PaymentProviderName;
  /** The callback payload from the provider. */
  payload: Record<string, unknown>;
  /** Raw request body string. Some providers compute signature over the raw body. */
  rawBody?: string;

  /** Optional HTTP headers from the callback request. */
  headers?: Record<string, string>;
}

/** Result after verifying a payment callback. */
export interface VerifyPaymentCallbackResult {
  /** The provider that handled this callback. */
  provider: PaymentProviderName;
  /** Provider-side payment order ID extracted from the callback. */
  providerPaymentId: string;
  /** Whether the payment was successfully paid. */
  paid: boolean;
  /** Actual paid amount in TWD (for amount verification). */
  amountTwd?: number;
  /** Raw verified payload for debugging / record-keeping. */
  raw?: Record<string, unknown>;
}

/**
 * PaymentProvider interface.
 *
 * All real payment providers (newebpay, ecpay, linepay) must implement this interface.
 * The application code should only interact with PaymentProvider, never directly
 * with a specific provider's API.
 */
export interface PaymentProvider {
  /** Get the provider name. */
  getProviderName(): PaymentProviderName;

  /**
   * Create a payment order.
   * - Calls the provider API to create an order
   * - Returns a payment URL (redirect) or form HTML (POST) for the customer to complete payment
   * - Does NOT create local Payment records (caller's responsibility)
   */
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  /**
   * Verify a payment callback / webhook payload.
   * - Validates signature, amount, and order ID
   * - Does NOT update local Payment status (caller's responsibility)
   */
  verifyCallback(input: VerifyPaymentCallbackInput): Promise<VerifyPaymentCallbackResult>;

  /**
   * Refund a payment (optional, not implemented in MVP).
   */
  refundPayment?(input: {
    providerPaymentId: string;
    amountTwd: number;
  }): Promise<{ success: boolean }>;
}
