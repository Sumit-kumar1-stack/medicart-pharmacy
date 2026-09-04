import Razorpay from "razorpay";
import crypto from "crypto";

import { env } from "@/lib/env";

import {
  PaymentProvider,
  CreatePaymentOrderInput,
  CreatePaymentOrderResult,
  VerifyPaymentInput,
} from "./payment-provider";

export class RazorpayProvider implements PaymentProvider {
  private razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID!,
    key_secret: env.RAZORPAY_KEY_SECRET!,
  });

  async createOrder(
    input: CreatePaymentOrderInput
  ): Promise<CreatePaymentOrderResult> {
    const order = await this.razorpay.orders.create({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
    });

    return {
      providerOrderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
    };
  }

  async verifyPayment(
    input: VerifyPaymentInput
  ): Promise<boolean> {
    const expected = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET!)
      .update(
        `${input.providerOrderId}|${input.providerPaymentId}`
      )
      .digest("hex");

    return expected === input.signature;
  }
}