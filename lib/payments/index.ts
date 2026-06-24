// ─── Payment Provider Abstraction — Entry Point ───

import { mockPaymentProvider } from "./providers/mock";
import { newebpayProvider } from "./providers/newebpay";
import { ecpayProvider } from "./providers/ecpay";
import type { PaymentProviderName, PaymentProvider } from "./types";

export { mockPaymentProvider } from "./providers/mock";
export { newebpayProvider } from "./providers/newebpay";
export { ecpayProvider } from "./providers/ecpay";
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
      return newebpayProvider;
    case "ecpay":
      return ecpayProvider;
    case "linepay":
      throw new Error("Payment provider not implemented yet: linepay");
    default:
      throw new Error(`Unknown payment provider: ${name}`);
  }
}
