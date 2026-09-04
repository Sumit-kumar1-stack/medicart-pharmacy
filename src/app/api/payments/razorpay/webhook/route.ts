import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        amount?: number;
        currency?: string;
        error_description?: string;
      };
    };
  };
};

function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing Razorpay webhook signature",
        },
        { status: 400 }
      );
    }

    const rawBody = await request.text();

    const isValidSignature = verifyWebhookSignature(rawBody, signature);

    if (!isValidSignature) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Razorpay webhook signature",
        },
        { status: 400 }
      );
    }

    const body = JSON.parse(rawBody) as RazorpayWebhookPayload;
    const event = body.event;
    const paymentEntity = body.payload?.payment?.entity;

    if (!paymentEntity?.id || !paymentEntity.order_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Razorpay webhook payload",
        },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        providerOrderId: paymentEntity.order_id,
      },
      include: {
        order: true,
      },
    });

    if (!payment) {
      return NextResponse.json({
        success: true,
        message: "Payment record not found. Webhook ignored.",
      });
    }

    if (payment.status === "PAID") {
      return NextResponse.json({
        success: true,
        message: "Payment already processed",
      });
    }

    if (event === "payment.failed" || paymentEntity.status === "failed") {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "FAILED",
          providerPaymentId: paymentEntity.id,
          failureReason:
            paymentEntity.error_description ?? "Razorpay payment failed",
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "PAYMENT_WEBHOOK_FAILED",
          resourceType: "Payment",
          resourceId: payment.id,
          metadata: {
            orderId: payment.orderId,
            publicId: payment.order.publicId,
            providerOrderId: paymentEntity.order_id,
            providerPaymentId: paymentEntity.id,
            event,
          } as Prisma.InputJsonValue,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Failed payment webhook processed",
      });
    }

    if (
      event === "payment.captured" ||
      paymentEntity.status === "captured" ||
      paymentEntity.status === "authorized"
    ) {
      await prisma.$transaction(async (tx) => {
        const latestPayment = await tx.payment.findUnique({
          where: {
            id: payment.id,
          },
          include: {
            order: true,
          },
        });

        if (!latestPayment) {
          throw new Error("Payment record not found during webhook processing");
        }

        if (latestPayment.status === "PAID") {
          return;
        }

        const updatedPayment = await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: "PAID",
            providerPaymentId: paymentEntity.id,
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
            note: "Payment confirmed through Razorpay webhook",
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
            action: "PAYMENT_WEBHOOK_VERIFIED",
            resourceType: "Payment",
            resourceId: updatedPayment.id,
            metadata: {
              orderId: updatedOrder.id,
              publicId: updatedOrder.publicId,
              providerOrderId: paymentEntity.order_id,
              providerPaymentId: paymentEntity.id,
              event,
            } as Prisma.InputJsonValue,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Payment webhook processed successfully",
      });
    }

    return NextResponse.json({
      success: true,
      message: `Webhook event ignored: ${event ?? "unknown"}`,
    });
  } catch (error) {
    console.error("Razorpay webhook failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process Razorpay webhook",
      },
      { status: 500 }
    );
  }
}