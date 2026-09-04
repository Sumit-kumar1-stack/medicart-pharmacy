import { env } from "@/lib/env";

import { DemoProvider } from "./demo-provider";
import { RazorpayProvider } from "./razorpay-provider";

export function getPaymentProvider() {
  if (env.PAYMENT_PROVIDER === "razorpay") {
    return new RazorpayProvider();
  }

  return new DemoProvider();
}