import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";

export async function POST() {
  try {
    const paymentProvider = getPaymentProvider();

    // Temporary values.
    // Later these will come from the authenticated user's cart.
    const result = await paymentProvider.createOrder({
      orderId: "demo-order",
      amount: 50000, // ₹500.00 (amount is in paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Unable to create payment order",
      },
      {
        status: 500,
      }
    );
  }
}