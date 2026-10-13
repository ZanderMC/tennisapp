import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, Order, Payment } from "mercadopago";
import { NextResponse } from "next/server";
import {
  findOrderByExternalReference,
  findOrderByPaymentId,
  updateOrder,
} from "@/src/lib/checkout-store";
import { prisma } from "@/src/lib/prisma";

function getEndTime(startTime: string): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + 60;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

function parseDateKey(dateKey: string): { start: Date; end: Date; marker: Date } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
  const marker = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

  return { start, end, marker };
}

async function persistReservationFromOrder(order: {
  id: string;
  userId?: string;
  reservation?: {
    court: string;
    selectedDate: string;
    selectedSlots: string[];
    total: number;
  };
  reservationPersistedAt?: string;
}) {
  if (!order.userId || !order.reservation || order.reservationPersistedAt) {
    return;
  }

  const userId = order.userId;
  const reservation = order.reservation;
  const parsed = parseDateKey(order.reservation.selectedDate);
  if (!parsed) {
    throw new Error("Fecha de reserva inválida en la orden.");
  }

  const uniqueSlots = Array.from(new Set(order.reservation.selectedSlots));
  if (uniqueSlots.length === 0) {
    throw new Error("La orden no tiene horarios de reserva.");
  }

  await prisma.$transaction(async (tx) => {
    const court =
      (await tx.court.findFirst({ where: { name: order.reservation?.court } })) ??
      (await tx.court.create({
        data: {
          name: order.reservation?.court ?? "Cancha",
          price: Number((reservation.total / uniqueSlots.length).toFixed(2)),
        },
      }));

    for (const slot of uniqueSlots) {
      const schedule =
        (await tx.schedule.findFirst({
          where: {
            courtId: court.id,
            date: {
              gte: parsed.start,
              lt: parsed.end,
            },
            timeStart: slot,
          },
        })) ??
        (await tx.schedule.create({
          data: {
            courtId: court.id,
            date: parsed.marker,
            timeStart: slot,
            timeEnd: getEndTime(slot),
          },
        }));

      const existingBooking = await tx.booking.findFirst({
        where: { scheduleId: schedule.id },
      });

      if (existingBooking) {
        if (existingBooking.userId !== order.userId) {
          throw new Error(`Conflicto: el horario ${slot} ya está reservado.`);
        }

        continue;
      }

      await tx.booking.create({
        data: {
          userId,
          scheduleId: schedule.id,
          amount: Number((reservation.total / uniqueSlots.length).toFixed(2)),
        },
      });
    }
  });

  await updateOrder(order.id, { reservationPersistedAt: new Date().toISOString() });
}

async function persistPaymentFromOrder(input: {
  order: {
    id: string;
    userId?: string;
    reservation?: {
      court: string;
      selectedDate: string;
      selectedSlots: string[];
      total: number;
    };
  };
  status: "approved" | "rejected" | "pending" | "in_process" | "cancelled";
  paymentId: string;
  statusDetail?: string;
  amount: number;
}) {
  if (!input.order.userId || !input.order.reservation) {
    return;
  }

  const parsed = parseDateKey(input.order.reservation.selectedDate);
  if (!parsed) {
    return;
  }

  const court = await prisma.court.findFirst({
    where: { name: input.order.reservation.court },
    select: { id: true },
  });

  if (!court) {
    return;
  }

  const schedules = await prisma.schedule.findMany({
    where: {
      courtId: court.id,
      date: {
        gte: parsed.start,
        lt: parsed.end,
      },
      timeStart: {
        in: input.order.reservation.selectedSlots,
      },
    },
    select: {
      id: true,
    },
  });

  if (schedules.length === 0) {
    return;
  }

  const bookings = await prisma.booking.findMany({
    where: {
      userId: input.order.userId,
      scheduleId: {
        in: schedules.map((s) => s.id),
      },
    },
    select: {
      id: true,
    },
  });

  if (bookings.length === 0) {
    return;
  }

  const paymentStatus =
    input.status === "approved"
      ? "APPROVED"
      : input.status === "rejected"
        ? "REJECTED"
        : "PENDING";

  const amountPerBooking = Number((input.amount / bookings.length).toFixed(2));

  for (const booking of bookings) {
    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        mpPaymentId: input.paymentId,
        status: paymentStatus,
        amount: amountPerBooking,
        externalRef: input.order.id,
        method: input.statusDetail,
      },
      create: {
        bookingId: booking.id,
        mpPaymentId: input.paymentId,
        status: paymentStatus,
        amount: amountPerBooking,
        externalRef: input.order.id,
        method: input.statusDetail,
      },
    });
  }

  if (input.status === "approved") {
    await prisma.booking.updateMany({
      where: {
        id: {
          in: bookings.map((b) => b.id),
        },
      },
      data: {
        status: "PAID",
      },
    });
  }
}

function mapPaymentStatus(status: string | undefined) {
  if (!status) {
    return "pending" as const;
  }

  if (status === "approved") return "approved" as const;
  if (status === "rejected") return "rejected" as const;
  if (status === "cancelled") return "cancelled" as const;
  if (status === "in_process") return "in_process" as const;

  return "pending" as const;
}

function mapOrderStatus(orderStatus: string | undefined, paymentStatus: string | undefined) {
  const status = paymentStatus ?? orderStatus;

  if (status === "processed" || status === "accredited" || status === "approved") {
    return "approved" as const;
  }

  if (status === "failed" || status === "rejected" || status === "cancelled") {
    return status === "cancelled" ? ("cancelled" as const) : ("rejected" as const);
  }

  if (status === "action_required" || status === "in_process") {
    return "in_process" as const;
  }

  return "pending" as const;
}

function isValidWebhookSignature(request: Request, paymentId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;

  // Signature validation is enabled when the secret is configured in the MP panel.
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signature || !requestId) {
    return false;
  }

  const values = new Map(
    signature.split(",").map((part) => {
      const separator = part.indexOf("=");
      return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
    }),
  );
  const timestamp = values.get("ts");
  const receivedHash = values.get("v1");
  if (!timestamp || !receivedHash) {
    return false;
  }

  const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
  const expectedHash = createHmac("sha256", secret).update(manifest).digest("hex");
  const expectedBuffer = Buffer.from(expectedHash, "utf8");
  const receivedBuffer = Buffer.from(receivedHash, "utf8");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const accessToken = process.env.MP_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json({ message: "Falta MP_ACCESS_TOKEN." }, { status: 500 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const parsed = body as {
    type?: string;
    action?: string;
    data?: { id?: string | number };
  };

  const isPaymentNotification =
    parsed.type === "payment" || parsed.action === "payment.created" || parsed.action === "payment.updated";
  const isOrderNotification =
    parsed.type === "order" || parsed.action === "order.created" || parsed.action === "order.updated";

  const resourceId = parsed.data?.id ? String(parsed.data.id) : null;

  if ((!isPaymentNotification && !isOrderNotification) || !resourceId) {
    return NextResponse.json({ ok: true });
  }

  if (!isValidWebhookSignature(request, resourceId)) {
    return NextResponse.json({ message: "Firma de webhook inválida." }, { status: 401 });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken });

    if (isOrderNotification) {
      const orderClient = new Order(client);
      const mercadoPagoOrder = await orderClient.get({ id: resourceId });
      const transactionPayment = mercadoPagoOrder.transactions?.payments?.[0];
      const paymentId = transactionPayment?.id ? String(transactionPayment.id) : resourceId;
      const order =
        (await findOrderByPaymentId(paymentId)) ??
        (mercadoPagoOrder.external_reference
          ? await findOrderByExternalReference(mercadoPagoOrder.external_reference)
          : null);

      if (order) {
        const status = mapOrderStatus(mercadoPagoOrder.status, transactionPayment?.status);
        const updatedOrder =
          (await updateOrder(order.id, {
            paymentId,
            status,
            statusDetail: transactionPayment?.status_detail ?? mercadoPagoOrder.status_detail,
          })) ?? order;

        if (status === "approved") {
          await persistReservationFromOrder(updatedOrder);
        }

        await persistPaymentFromOrder({
          order: updatedOrder,
          status,
          paymentId,
          statusDetail: transactionPayment?.status_detail ?? mercadoPagoOrder.status_detail,
          amount: Number(
            transactionPayment?.paid_amount ??
              transactionPayment?.amount ??
              mercadoPagoOrder.total_paid_amount ??
              updatedOrder.amount,
          ),
        });
      }

      return NextResponse.json({ ok: true });
    }

    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: resourceId });

    const order =
      (await findOrderByPaymentId(String(payment.id))) ??
      (payment.external_reference
        ? await findOrderByExternalReference(payment.external_reference)
        : null);

    if (order) {
      const status = mapPaymentStatus(payment.status);

      const updatedOrder =
        (await updateOrder(order.id, {
          status,
          statusDetail: payment.status_detail,
        })) ?? order;

      if (status === "approved") {
        await persistReservationFromOrder(updatedOrder);
      }

      await persistPaymentFromOrder({
        order: updatedOrder,
        status,
        paymentId: String(payment.id),
        statusDetail: payment.status_detail,
        amount: Number(payment.transaction_amount ?? updatedOrder.amount),
      });
    }
  } catch (error) {
    // El webhook debe responder 200 para evitar reintentos innecesarios por errores transitorios.
    console.error("Error procesando webhook de pago", error);
  }

  return NextResponse.json({ ok: true });
}
