import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, jsonError, AppError } from "@/lib/http";
import { env } from "@/lib/env";
import { checkout } from "@/lib/checkout";
import { enqueueNotification } from "@/lib/queue";

const schema = z.object({
  prescriptionId: z.string().optional(),
  address: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(/^[0-9+ -]{8,18}$/),
    line1: z.string().trim().min(4).max(140),
    line2: z.string().trim().max(140).optional(),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().regex(/^[0-9A-Za-z -]{4,10}$/),
  }),
});

export async function GET() {
  try {
    const user = await requireUser();

    const orders = await prisma.order.findMany({
      where: {
        userId: user.id,
      },
      include: {
        items: true,
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
        statusHistory: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      orders,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);

    if (
      env.NODE_ENV === "production" &&
      env.PAYMENT_PROVIDER === "demo" &&
      !env.ALLOW_DEMO_PAYMENTS_IN_PRODUCTION
    ) {
      throw new AppError(
        503,
        "PAYMENT_PROVIDER_REQUIRED",
        "Demo payments are disabled in production. Configure a real payment provider adapter before accepting orders."
      );
    }

    const user = await requireUser();
    const data = schema.parse(await req.json());

    const order = await checkout(
      prisma,
      user.id,
      data.prescriptionId,
      data.address
    );

    await enqueueNotification(
      user.id,
      "Order created",
      `${order.publicId} is waiting for payment.`
    );

    return NextResponse.json(
      {
        success: true,
        order,
        nextAction: "PAYMENT_REQUIRED",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return jsonError(error);
  }
}