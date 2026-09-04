import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";

const createPaymentOrderSchema = z.object({
  orderId: z.string().min(1),
});

export async function GET() {
  return NextResponse.json({
    message: "Payment create-order route is working. Use POST with { orderId }.",
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const parsed = createPaymentOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid create payment order request",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        id: parsed.data.orderId,
        userId: user.id,
      },
      include: {
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        { status: 404 }
      );
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json(
        {
          success: false,
          message: "Order is already paid",
        },
        { status: 409 }
      );
    }

    if (order.status !== "PAYMENT_PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Order is not waiting for payment",
        },
        { status: 409 }
      );
    }

    const existingPayment = order.payments.find(
      (payment) =>
        payment.status === "PENDING" && Boolean(payment.providerOrderId)
    );

    if (existingPayment?.providerOrderId) {
      return NextResponse.json({
        success: true,
        orderId: order.id,
        publicId: order.publicId,
        providerOrderId: existingPayment.providerOrderId,
        amount: existingPayment.amountPaise,
        currency: existingPayment.currency,
      });
    }

    const payment =
      order.payments.find((item) => item.status === "PENDING") ??
      (await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "razorpay",
          status: "PENDING",
          amountPaise: order.totalPaise,
          currency: "INR",
        },
      }));

    const paymentProvider = getPaymentProvider();

    const providerOrder = await paymentProvider.createOrder({
      orderId: order.id,
      amount: order.totalPaise,
      currency: "INR",
      receipt: order.publicId,
    });

    const updatedPayment = await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        provider: "razorpay",
        providerOrderId: providerOrder.providerOrderId,
        amountPaise: Number(providerOrder.amount),
        currency: providerOrder.currency,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "PAYMENT_ORDER_CREATED",
        resourceType: "Payment",
        resourceId: updatedPayment.id,
        metadata: {
          orderId: order.id,
          publicId: order.publicId,
          providerOrderId: updatedPayment.providerOrderId,
          amountPaise: updatedPayment.amountPaise,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      publicId: order.publicId,
      providerOrderId: updatedPayment.providerOrderId,
      amount: updatedPayment.amountPaise,
      currency: updatedPayment.currency,
    });
  } catch (error) {
    console.error("Create payment order failed:", error);
    return jsonError(error);
  }
}