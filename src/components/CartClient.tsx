"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatInr } from "@/lib/money";
import { loadRazorpayScript } from "@/lib/load-razorpay";

type Item = {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    pricePaise: number;
    prescriptionRequired: boolean;
  };
};

type Rx = {
  id: string;
  reviewedAt: string | null;
  items: {
    productId: string;
    maxQuantity: number | null;
  }[];
};

type OrderApiResponse = {
  success?: boolean;
  order?: {
    id: string;
    publicId: string;
    totalPaise: number;
  };
  message?: string;
};

type CreatePaymentOrderResponse = {
  success: boolean;
  orderId: string;
  publicId: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  message?: string;
};

type VerifyPaymentResponse = {
  success: boolean;
  message: string;
  paymentId?: string;
  orderId?: string;
  medicartOrderId?: string;
  publicId?: string;
  status?: string;
  paymentStatus?: string;
};

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export function CartClient({
  initialItems,
  prescriptions,
}: {
  initialItems: Item[];
  prescriptions: Rx[];
}) {
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.product.pricePaise * item.quantity,
        0
      ),
    [items]
  );

  const delivery = subtotal >= 49900 ? 0 : 4900;
  const total = subtotal + delivery;
  const needsRx = items.some((item) => item.product.prescriptionRequired);

  async function qty(productId: string, quantity: number) {
    const res = await fetch(`/api/cart/${productId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ quantity }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.message ?? "Unable to update quantity");
      return;
    }

    setItems((existingItems) =>
      existingItems.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );

    router.refresh();
  }

  async function remove(productId: string) {
    await fetch(`/api/cart/${productId}`, {
      method: "DELETE",
    });

    setItems((existingItems) =>
      existingItems.filter((item) => item.productId !== productId)
    );

    router.refresh();
  }

  async function verifyPayment(paymentResponse: RazorpaySuccessResponse) {
    const verifyRes = await fetch("/api/payments/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(paymentResponse),
    });

    const verifyBody = (await verifyRes.json().catch(() => ({}))) as
      | VerifyPaymentResponse
      | { message?: string };

    if (!verifyRes.ok || !("success" in verifyBody) || !verifyBody.success) {
      throw new Error(
        "message" in verifyBody && verifyBody.message
          ? verifyBody.message
          : "Payment verification failed"
      );
    }

    return verifyBody;
  }

  async function openRazorpayCheckout(orderId: string) {
    const loaded = await loadRazorpayScript();

    if (!loaded) {
      throw new Error("Razorpay checkout script failed to load");
    }

    const paymentOrderRes = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        orderId,
      }),
    });

    const paymentOrder =
      (await paymentOrderRes.json().catch(() => ({}))) as CreatePaymentOrderResponse;

    if (!paymentOrderRes.ok || !paymentOrder.success) {
      throw new Error(
        paymentOrder.message ?? "Unable to create Razorpay payment order"
      );
    }

    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    if (!key) {
      throw new Error("NEXT_PUBLIC_RAZORPAY_KEY_ID is missing");
    }

    return new Promise<void>((resolve, reject) => {
      const razorpay = new window.Razorpay({
        key,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: "MediCart Pharmacy",
        description: `Order ${paymentOrder.publicId}`,
        order_id: paymentOrder.providerOrderId,
        prefill: {
          name: "Demo Customer",
          email: "customer@medicart.local",
          contact: "9999999999",
        },
        theme: {
          color: "#0f766e",
        },
        modal: {
          ondismiss: () => {
            reject(new Error("Payment popup closed by user"));
          },
        },
        handler: async (paymentResponse: RazorpaySuccessResponse) => {
          try {
            await verifyPayment(paymentResponse);
            resolve();
          } catch (verifyError) {
            reject(verifyError);
          }
        },
      });

      razorpay.on("payment.failed", (paymentError) => {
        reject(
          new Error(
            JSON.stringify(
              {
                message: "Payment failed",
                error: paymentError,
              },
              null,
              2
            )
          )
        );
      });

      razorpay.open();
    });
  }

  async function checkout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setBusy(true);
      setError("");

      const fd = new FormData(e.currentTarget);

      const payload = {
        prescriptionId: fd.get("prescriptionId") || undefined,
        address: {
          name: fd.get("name"),
          phone: fd.get("phone"),
          line1: fd.get("line1"),
          line2: fd.get("line2") || undefined,
          city: fd.get("city"),
          state: fd.get("state"),
          postalCode: fd.get("postalCode"),
        },
      };

      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const orderBody = (await orderRes.json().catch(() => ({}))) as OrderApiResponse;

      if (!orderRes.ok || !orderBody.order?.id) {
        throw new Error(orderBody.message ?? "Checkout failed");
      }

      await openRazorpayCheckout(orderBody.order.id);

      router.push("/orders");
      router.refresh();
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout failed"
      );
    } finally {
      setBusy(false);
    }
  }

  if (!items.length) {
    return (
      <div className="panel">
        Your cart is empty. Add medicines or wellness products from the catalog.
      </div>
    );
  }

  return (
    <div className="cart-layout">
      <div className="list">
        {items.map((item) => (
          <div className="row-card" key={item.id}>
            <div>
              <span
                className={
                  item.product.prescriptionRequired ? "rx-badge" : "otc-badge"
                }
                style={{ position: "static" }}
              >
                {item.product.prescriptionRequired ? "Rx required" : "OTC"}
              </span>

              <h3 style={{ marginTop: 8 }}>{item.product.name}</h3>

              <span className="muted">
                {formatInr(item.product.pricePaise)} each
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() =>
                  qty(item.productId, Math.max(1, item.quantity - 1))
                }
              >
                −
              </button>

              <b>{item.quantity}</b>

              <button
                type="button"
                className="btn"
                onClick={() =>
                  qty(item.productId, Math.min(20, item.quantity + 1))
                }
              >
                +
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={() => remove(item.productId)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <form className="panel summary form-grid" onSubmit={checkout}>
        <h3>Checkout</h3>

        <div className="summary-line">
          <span>Subtotal</span>
          <b>{formatInr(subtotal)}</b>
        </div>

        <div className="summary-line">
          <span>Delivery</span>
          <b>{delivery ? formatInr(delivery) : "FREE"}</b>
        </div>

        <div className="summary-line summary-total">
          <span>Total</span>
          <span>{formatInr(total)}</span>
        </div>

        {needsRx && (
          <div className="field">
            <label>Approved prescription</label>

            <select name="prescriptionId" required defaultValue="">
              <option value="" disabled>
                Select prescription
              </option>

              {prescriptions.map((prescription) => (
                <option key={prescription.id} value={prescription.id}>
                  Approved{" "}
                  {prescription.reviewedAt
                    ? new Date(prescription.reviewedAt).toLocaleDateString(
                        "en-IN"
                      )
                    : ""}
                </option>
              ))}
            </select>

            {!prescriptions.length && (
              <div className="alert">
                No approved prescription yet. Upload one and wait for pharmacist
                review.
              </div>
            )}
          </div>
        )}

        <div className="field">
          <label>Name</label>
          <input name="name" required defaultValue="Demo Customer" />
        </div>

        <div className="field">
          <label>Phone</label>
          <input name="phone" required placeholder="9876543210" />
        </div>

        <div className="field">
          <label>Address</label>
          <input name="line1" required placeholder="House / street" />
        </div>

        <div className="field">
          <label>Address line 2</label>
          <input name="line2" />
        </div>

        <div className="two-col">
          <div className="field">
            <label>City</label>
            <input name="city" required />
          </div>

          <div className="field">
            <label>State</label>
            <input name="state" required />
          </div>
        </div>

        <div className="field">
          <label>PIN / postal code</label>
          <input name="postalCode" required />
        </div>

        {error && <div className="alert">{error}</div>}

        <button
          className="btn btn-primary"
          disabled={busy || Boolean(needsRx && !prescriptions.length)}
        >
          {busy ? "Processing..." : "Pay with Razorpay"}
        </button>

        <p className="small muted">
          Razorpay is running in test mode. No real money will be deducted while
          using rzp_test keys.
        </p>
      </form>
    </div>
  );
}