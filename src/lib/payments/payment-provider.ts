export interface CreatePaymentOrderInput {
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
}

export interface CreatePaymentOrderResult {
  providerOrderId: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentInput {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

export interface PaymentProvider {
  createOrder(
    input: CreatePaymentOrderInput
  ): Promise<CreatePaymentOrderResult>;

  verifyPayment(
    input: VerifyPaymentInput
  ): Promise<boolean>;
}