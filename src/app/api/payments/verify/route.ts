import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const parsed = verifyPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment verification request",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        providerOrderId: parsed.data.razorpay_order_id,
      },
      include: {
        order: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment record not found",
        },
        { status: 404 }
      );
    }

    if (payment.order.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot verify this payment",
        },
        { status: 403 }
      );
    }

    if (payment.status === "PAID") {
      return NextResponse.json({
        success: true,
        message: "Payment already verified",
        paymentId: payment.providerPaymentId,
        orderId: payment.providerOrderId,
        medicartOrderId: payment.orderId,
        publicId: payment.order.publicId,
        status: payment.order.status,
        paymentStatus: payment.order.paymentStatus,
      });
    }

    const paymentProvider = getPaymentProvider();

    const verified = await paymentProvider.verifyPayment({
      providerOrderId: parsed.data.razorpay_order_id,
      providerPaymentId: parsed.data.razorpay_payment_id,
      signature: parsed.data.razorpay_signature,
    });

    if (!verified) {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "FAILED",
          providerPaymentId: parsed.data.razorpay_payment_id,
          providerSignature: parsed.data.razorpay_signature,
          failureReason: "Signature verification failed",
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Payment signature verification failed",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const latestPayment = await tx.payment.findUnique({
        where: {
          id: payment.id,
        },
        include: {
          order: true,
        },
      });

      if (!latestPayment) {
        throw new Error("Payment record disappeared during verification");
      }

      if (latestPayment.status === "PAID") {
        return {
          updatedPayment: latestPayment,
          updatedOrder: latestPayment.order,
        };
      }

      const updatedPayment = await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "PAID",
          providerPaymentId: parsed.data.razorpay_payment_id,
          providerSignature: parsed.data.razorpay_signature,
          paidAt: new Date(),
          failureReason: null,
        },
      });

      const updatedOrder = await tx.order.update({
        where: {
          id: payment.orderId,
        },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          status: "CONFIRMED",
          note: "Payment verified through Razorpay",
        },
      });

      await tx.notification.create({
        data: {
          userId: payment.order.userId,
          title: "Payment successful",
          body: `Your order ${payment.order.publicId} has been confirmed.`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "PAYMENT_VERIFIED",
          resourceType: "Payment",
          resourceId: updatedPayment.id,
          metadata: {
            orderId: updatedOrder.id,
            publicId: updatedOrder.publicId,
            providerOrderId: parsed.data.razorpay_order_id,
            providerPaymentId: parsed.data.razorpay_payment_id,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        updatedPayment,
        updatedOrder,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      paymentId: result.updatedPayment.providerPaymentId,
      orderId: result.updatedPayment.providerOrderId,
      medicartOrderId: result.updatedOrder.id,
      publicId: result.updatedOrder.publicId,
      status: result.updatedOrder.status,
      paymentStatus: result.updatedOrder.paymentStatus,
    });
  } catch (error) {
    console.error("Payment verification failed:", error);
    return jsonError(error);
  }
}