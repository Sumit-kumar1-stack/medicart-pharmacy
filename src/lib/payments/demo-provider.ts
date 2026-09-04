import {
  PaymentProvider,
  CreatePaymentOrderInput,
  CreatePaymentOrderResult,
  VerifyPaymentInput,
} from "./payment-provider";

export class DemoProvider implements PaymentProvider {
  async createOrder(
    input: CreatePaymentOrderInput
  ): Promise<CreatePaymentOrderResult> {
    return {
      providerOrderId: `demo_${Date.now()}`,
      amount: input.amount,
      currency: input.currency,
    };
  }

  async verifyPayment(
    _input: VerifyPaymentInput
  ): Promise<boolean> {
    return true;
  }
}