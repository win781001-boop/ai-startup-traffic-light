// ─── Payment Provider Abstraction — Entry Point ───

import { mockPaymentProvider } from "./providers/mock";
import type { PaymentProviderName, PaymentProvider } from "./types";

export { mockPaymentProvider } from "./providers/mock";
export type {
  PaymentProviderName,
  CreatePaymentInput,
  CreatePaymentResult,
  VerifyPaymentCallbackInput,
  VerifyPaymentCallbackResult,
  PaymentProvider,
} from "./types";

/**
 * Get a PaymentProvider implementation by name.
 *
 * @param name - The provider name ("mock" | "newebpay" | "ecpay" | "linepay")
 * @returns A PaymentProvider instance
 * @throws Error if the provider is not yet implemented
 *
 * @example
 * const provider = getPaymentProvider("mock");
 * const result = await provider.createPayment({ amountTwd: 49, description: "..." });
 */
export function getPaymentProvider(name: PaymentProviderName): PaymentProvider {
  switch (name) {
    case "mock":
      return mockPaymentProvider;
    case "newebpay":
      throw new Error("Payment provider not implemented yet: newebpay");
    case "ecpay":
      throw new Error("Payment provider not implemented yet: ecpay");
    case "linepay":
      throw new Error("Payment provider not implemented yet: linepay");
    default:
      throw new Error(`Unknown payment provider: ${name}`);
  }
}
