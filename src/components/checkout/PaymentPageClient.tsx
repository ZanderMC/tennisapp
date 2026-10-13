"use client";

import { initMercadoPago, Payment as PaymentBrick } from "@mercadopago/sdk-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ErrorResponse = {
  message?: string;
};

type OrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
};

type PaymentResponse = {
  id: string | number;
  status: string;
  status_detail?: string;
  orderId?: string;
};

type ReservationData = {
  court: string;
  selectedDate: string;
  selectedSlots: string[];
  total: number;
};

type PaymentPageClientProps = {
  reservation: ReservationData;
};

export   function PaymentPageClient({ reservation }: PaymentPageClientProps) {
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
  const router = useRouter();

  useEffect(() => {
    if (!publicKey) return;
    initMercadoPago(publicKey, { locale: "es-PE" });
  }, [publicKey]);

  useEffect(() => {
    const createOrder = async () => {
      try {
        setLoadingOrder(true);
        setOrder(null);
        setError(null);

        const response = await fetch("/api/checkout/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            court: reservation.court,
            selectedDate: reservation.selectedDate,
            selectedSlots: reservation.selectedSlots,
            total: reservation.total,
          }),
        });

        const data = (await response.json().catch(() => null)) as
          | (OrderResponse & ErrorResponse)
          | null;

        if (!response.ok || !data?.orderId) {
          throw new Error(data?.message ?? "No se pudo crear la orden");
        }

        setOrder(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error inesperado";
        setError(message);
      } finally {
        setLoadingOrder(false);
      }
    };

    createOrder();
  }, [reservation]);

  const createPayment = async ({ formData }: { formData: unknown }) => {
    if (!order) {
      setError("No hay orden activa para procesar el pago.");
      return;
    }

    try {
      setLoadingPayment(true);
      setError(null);

      const response = await fetch("/api/checkout/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, formData }),
      });

      const data = (await response.json().catch(() => null)) as
        | (ErrorResponse & Partial<PaymentResponse>)
        | null;

      if (!response.ok) {
        throw new Error(data?.message ?? "No se pudo procesar el pago");
      }

      router.push(`/checkout/result/${order.orderId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoadingPayment(false);
    }
  };

  if (!publicKey) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
        Falta NEXT_PUBLIC_MP_PUBLIC_KEY en tu archivo .env.local.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Finalizar pago</h2>
          <p className="text-sm text-zinc-500">Completa tus datos para confirmar la reserva.</p>
        </div>
        <p className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          S/ {reservation.total.toFixed(2)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="rounded-xl border border-black/10 bg-white p-4 md:p-5">
          {loadingOrder ? <p className="text-sm text-zinc-600">Preparando orden...</p> : null}

          {order && !loadingOrder ? (
            <PaymentBrick
              initialization={{ amount: order.amount }}
              customization={{
                paymentMethods: {
                  creditCard: "all",
                  minInstallments: 1,
                  maxInstallments: 1,
                },
              }}
              onSubmit={createPayment}
              onError={(brickError) => {
                const errorType =
                  typeof brickError === "object" && brickError !== null && "type" in brickError
                    ? String(brickError.type)
                    : "unknown";

                if (errorType === "non_critical") {
                  setError(null);
                  return;
                }

                console.error("Error crítico del brick", brickError);
                setError("Error en el formulario de pago. Revisa los datos e intenta nuevamente.");
              }}
            />
          ) : null}

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          {loadingPayment ? <p className="mt-4 text-sm text-zinc-600">Procesando pago...</p> : null}
        </div>

        <aside className="rounded-2xl border border-emerald-100 bg-linear-to-b from-emerald-50 to-white p-5 shadow-sm lg:sticky lg:top-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Resumen</p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-900">Tu reserva</h3>

          <div className="mt-4 space-y-3 text-sm text-zinc-700">
            <div className="rounded-lg bg-white/80 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Cancha</p>
              <p className="mt-1 font-medium text-zinc-900">{reservation.court}</p>
            </div>

            <div className="rounded-lg bg-white/80 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Fecha</p>
              <p className="mt-1 font-medium text-zinc-900">{reservation.selectedDate}</p>
            </div>

            <div className="rounded-lg bg-white/80 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Horarios ({reservation.selectedSlots.length})</p>
              <p className="mt-1 font-medium text-zinc-900">{reservation.selectedSlots.join(", ")}</p>
            </div>
          </div>

          <div className="mt-5 border-t border-emerald-100 pt-4">
            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>Subtotal</span>
              <span>S/ {reservation.total.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-base font-semibold text-zinc-900">
              <span>Total a pagar</span>
              <span>S/ {reservation.total.toFixed(2)}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
