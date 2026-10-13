"use client";

import { useEffect, useMemo, useState } from "react";

type OrderData = {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  statusDetail?: string;
  paymentId?: string;
  updatedAt: string;
};

// Mapa de status_detail → mensaje amigable (checklist MP: "response_messages")
const STATUS_DETAIL_MESSAGES: Record<string, string> = {
  // Aprobados
  accredited: "Tu pago fue acreditado con éxito.",
  // Pendientes
  pending_contingency: "El pago está siendo procesado. Te notificaremos cuando esté listo.",
  pending_review_manual: "Tu pago está en revisión. Te notificaremos en hasta 2 días hábiles.",
  pending_waiting_payment: "Esperando confirmación del pago.",
  // Rechazados
  cc_rejected_bad_filled_card_number: "Número de tarjeta incorrecto. Revísalo e intenta de nuevo.",
  cc_rejected_bad_filled_date: "Fecha de vencimiento incorrecta. Revísala e intenta de nuevo.",
  cc_rejected_bad_filled_other: "Datos de la tarjeta incorrectos. Revísalos e intenta de nuevo.",
  cc_rejected_bad_filled_security_code: "Código de seguridad (CVV) incorrecto.",
  cc_rejected_blacklist: "Tu tarjeta no puede procesar pagos en este momento.",
  cc_rejected_call_for_authorize: "Debes autorizar el pago con tu banco antes de continuar.",
  cc_rejected_card_disabled: "Tu tarjeta está desactivada. Contáctate con tu banco.",
  cc_rejected_card_error: "No pudimos procesar tu tarjeta. Intenta con otra.",
  cc_rejected_duplicated_payment: "Este pago ya fue realizado anteriormente.",
  cc_rejected_high_risk: "Pago rechazado por seguridad. Intenta con otro medio de pago.",
  cc_rejected_insufficient_amount: "Fondos insuficientes en tu tarjeta.",
  cc_rejected_invalid_installments: "Número de cuotas no disponible para esta tarjeta.",
  cc_rejected_max_attempts: "Límite de intentos alcanzado. Usa otra tarjeta.",
  cc_rejected_other_reason: "Tu tarjeta no procesó el pago. Intenta con otro medio.",
};

function getStatusDetailMessage(detail?: string): string | null {
  if (!detail) return null;
  return STATUS_DETAIL_MESSAGES[detail] ?? null;
}

export function OrderStatusCard({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadOrder = async () => {
      try {
        const response = await fetch(`/api/checkout/orders/${orderId}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json().catch(() => null)) as
          | (OrderData & { message?: string })
          | null;

        if (!response.ok) {
          throw new Error(data?.message ?? "No se pudo consultar la orden");
        }

        if (mounted) {
          setOrder(data);
          setError(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error inesperado";
        if (mounted) {
          setError(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadOrder();

    const interval = setInterval(loadOrder, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [orderId]);

  const { statusLabel, statusColor, icon } = useMemo(() => {
    switch (order?.status) {
      case "approved":
        return { statusLabel: "¡Pago aprobado!", statusColor: "text-green-700 bg-green-50 border-green-300", icon: "✅" };
      case "in_process":
        return { statusLabel: "Pago en proceso", statusColor: "text-yellow-700 bg-yellow-50 border-yellow-300", icon: "⏳" };
      case "pending":
        return { statusLabel: "Pago pendiente", statusColor: "text-yellow-700 bg-yellow-50 border-yellow-300", icon: "⏳" };
      case "rejected":
        return { statusLabel: "Pago rechazado", statusColor: "text-red-700 bg-red-50 border-red-300", icon: "❌" };
      case "cancelled":
        return { statusLabel: "Pago cancelado", statusColor: "text-gray-600 bg-gray-50 border-gray-300", icon: "🚫" };
      default:
        return { statusLabel: "Procesando...", statusColor: "text-gray-600 bg-gray-50 border-gray-300", icon: "🔄" };
    }
  }, [order?.status]);

  if (loading) {
    return <section className="rounded-xl border border-black/10 p-6">Cargando estado...</section>;
  }

  if (error) {
    return <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-700">{error}</section>;
  }

  if (!order) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-700">
        No se encontró la orden.
      </section>
    );
  }

  const detailMessage = getStatusDetailMessage(order.statusDetail);

  return (
    <section className={`space-y-4 rounded-xl border p-6 ${statusColor}`}>
      <p className="text-2xl font-semibold">{icon} {statusLabel}</p>

      {detailMessage ? (
        <p className="text-sm">{detailMessage}</p>
      ) : null}

      <div className="space-y-1 border-t border-current/20 pt-4 text-sm opacity-80">
        <p><span className="font-medium">Producto:</span> {order.description}</p>
        <p><span className="font-medium">Monto:</span> S/ {order.amount}</p>
        {order.paymentId ? <p><span className="font-medium">ID de pago:</span> {order.paymentId}</p> : null}
        <p><span className="font-medium">Orden:</span> {order.id}</p>
        <p className="text-xs opacity-60">Última actualización: {new Date(order.updatedAt).toLocaleString("es-PE")}</p>
      </div>
    </section>
  );
}

