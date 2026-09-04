import { randomBytes } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { AppError } from "./http";
import { assertPrescriptionCoverage } from "./order-rules";
import { env } from "./env";

export type CheckoutAddress = {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
};

function publicOrderId() {
  return `MED-${Date.now().toString(36).toUpperCase()}-${randomBytes(2)
    .toString("hex")
    .toUpperCase()}`;
}

async function runCheckout(
  tx: Prisma.TransactionClient,
  userId: string,
  prescriptionId: string | undefined,
  address: CheckoutAddress
) {
  const cart = await tx.cartItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });

  if (!cart.length) {
    throw new AppError(400, "EMPTY_CART", "Your cart is empty");
  }

  const rxItems = cart.filter((x) => x.product.prescriptionRequired);

  let prescription: Awaited<ReturnType<typeof tx.prescription.findFirst>> | null =
    null;

  let approvals: { productId: string; maxQuantity: number | null }[] = [];

  if (rxItems.length) {
    if (!prescriptionId) {
      throw new AppError(
        400,
        "PRESCRIPTION_REQUIRED",
        "Select an approved prescription for prescription medicines"
      );
    }

    prescription = await tx.prescription.findFirst({
      where: {
        id: prescriptionId,
        userId,
        status: "APPROVED",
      },
    });

    if (!prescription) {
      throw new AppError(
        400,
        "INVALID_PRESCRIPTION",
        "The selected prescription is not approved for this account"
      );
    }

    approvals = await tx.prescriptionItem.findMany({
      where: { prescriptionId },
      select: {
        productId: true,
        maxQuantity: true,
      },
    });

    try {
      assertPrescriptionCoverage(
        cart.map((x) => ({
          productId: x.productId,
          quantity: x.quantity,
          prescriptionRequired: x.product.prescriptionRequired,
        })),
        approvals
      );
    } catch {
      throw new AppError(
        400,
        "PRESCRIPTION_COVERAGE",
        "Your approved prescription does not cover all Rx cart items/quantities"
      );
    }
  }

  const orderItems: {
    productId: string;
    nameSnapshot: string;
    unitPricePaise: number;
    quantity: number;
    batchSnapshot: string;
  }[] = [];

  for (const item of cart) {
    let remaining = item.quantity;
    const batchParts: string[] = [];

    const batches = await tx.inventoryBatch.findMany({
      where: {
        productId: item.productId,
        status: "ACTIVE",
        expiresAt: {
          gt: new Date(),
        },
        quantityAvailable: {
          gt: 0,
        },
      },
      orderBy: {
        expiresAt: "asc",
      },
    });

    for (const batch of batches) {
      if (remaining <= 0) break;

      const take = Math.min(remaining, batch.quantityAvailable);

      const updated = await tx.inventoryBatch.updateMany({
        where: {
          id: batch.id,
          quantityAvailable: {
            gte: take,
          },
        },
        data: {
          quantityAvailable: {
            decrement: take,
          },
        },
      });

      if (updated.count !== 1) {
        throw new AppError(
          409,
          "STOCK_CHANGED",
          "Stock changed during checkout. Please retry."
        );
      }

      remaining -= take;
      batchParts.push(`${batch.batchNumber}:${take}`);
    }

    if (remaining > 0) {
      throw new AppError(
        409,
        "OUT_OF_STOCK",
        `${item.product.name} no longer has enough eligible stock`
      );
    }

    orderItems.push({
      productId: item.productId,
      nameSnapshot: item.product.name,
      unitPricePaise: item.product.pricePaise,
      quantity: item.quantity,
      batchSnapshot: batchParts.join(", "),
    });
  }

  const subtotalPaise = orderItems.reduce(
    (sum, x) => sum + x.unitPricePaise * x.quantity,
    0
  );

  const deliveryPaise = subtotalPaise >= 49900 ? 0 : 4900;
  const totalPaise = subtotalPaise + deliveryPaise;

  const order = await tx.order.create({
    data: {
      publicId: publicOrderId(),
      userId,
      prescriptionId: prescription?.id,
      status: "PAYMENT_PENDING",
      paymentStatus: "PENDING",
      subtotalPaise,
      deliveryPaise,
      totalPaise,
      addressJson: address as Prisma.InputJsonValue,
      items: {
        create: orderItems,
      },
      statusHistory: {
        create: {
          status: "PAYMENT_PENDING",
          note: "Order created and waiting for payment",
        },
      },
      payments: {
        create: {
          provider: env.PAYMENT_PROVIDER,
          status: "PENDING",
          amountPaise: totalPaise,
          currency: "INR",
        },
      },
    },
    include: {
      items: true,
      statusHistory: true,
      payments: true,
    },
  });

  await tx.cartItem.deleteMany({
    where: { userId },
  });

  await tx.auditLog.create({
    data: {
      actorId: userId,
      action: "ORDER_CREATED",
      resourceType: "Order",
      resourceId: order.id,
      metadata: {
        publicId: order.publicId,
        totalPaise,
        paymentStatus: "PENDING",
      } as Prisma.InputJsonValue,
    },
  });

  return order;
}

export async function checkout(
  prisma: PrismaClient,
  userId: string,
  prescriptionId: string | undefined,
  address: CheckoutAddress
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        (tx) => runCheckout(tx, userId, prescriptionId, address),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 10000,
        }
      );
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2034" &&
        attempt < 2
      ) {
        continue;
      }

      throw e;
    }
  }

  throw new AppError(409, "CHECKOUT_RETRY", "Please retry checkout");
}