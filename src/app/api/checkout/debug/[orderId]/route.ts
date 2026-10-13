import { NextResponse } from "next/server";
import { getOrder } from "@/src/lib/checkout-store";
import { prisma } from "@/src/lib/prisma";

type PaymentRow = {
  id: number;
  bookingId: number;
  mpPaymentId: string | null;
  status: string;
  method: string | null;
  amount: number;
  externalRef: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function parseDateKey(dateKey: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

  return { start, end };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;
  const order = await getOrder(orderId);

  if (!order) {
    return NextResponse.json({ message: "Orden no encontrada." }, { status: 404 });
  }

  const reservation = order.reservation;

  if (!reservation || !order.userId) {
    return NextResponse.json({
      order,
      reservationDiagnostics: {
        hasReservationData: Boolean(reservation),
        hasUserId: Boolean(order.userId),
        message: "La orden no tiene datos completos para rastrear reservas.",
      },
    });
  }

  const parsed = parseDateKey(reservation.selectedDate);

  if (!parsed) {
    return NextResponse.json({
      order,
      reservationDiagnostics: {
        hasReservationData: true,
        hasUserId: true,
        message: "La fecha de la reserva es inválida.",
        selectedDate: reservation.selectedDate,
      },
    });
  }

  const court = await prisma.court.findFirst({
    where: { name: reservation.court },
    select: { id: true, name: true },
  });

  const schedules = court
    ? await prisma.schedule.findMany({
        where: {
          courtId: court.id,
          date: {
            gte: parsed.start,
            lt: parsed.end,
          },
          timeStart: {
            in: reservation.selectedSlots,
          },
        },
        select: {
          id: true,
          courtId: true,
          date: true,
          timeStart: true,
          timeEnd: true,
        },
        orderBy: {
          timeStart: "asc",
        },
      })
    : [];

  const bookings = schedules.length
    ? await prisma.booking.findMany({
        where: {
          userId: order.userId,
          scheduleId: {
            in: schedules.map((s) => s.id),
          },
        },
        select: {
          id: true,
          userId: true,
          scheduleId: true,
        },
      })
    : [];

  let payments: PaymentRow[] = [];
  let paymentQueryError: string | null = null;

  if (bookings.length > 0) {
    try {
      payments = await prisma.$queryRawUnsafe<PaymentRow[]>(
        `
          SELECT
            "id",
            "bookingId",
            "mpPaymentId",
            "status",
            "method",
            "amount",
            "externalRef",
            "createdAt",
            "updatedAt"
          FROM "Payment"
          WHERE "bookingId" = ANY($1::int[])
          ORDER BY "id" DESC
        `,
        bookings.map((b) => b.id),
      );
    } catch (error) {
      paymentQueryError = error instanceof Error ? error.message : "No se pudo consultar Payment.";
    }
  }

  return NextResponse.json({
    order,
    reservationDiagnostics: {
      selectedCourt: reservation.court,
      selectedDate: reservation.selectedDate,
      selectedSlots: reservation.selectedSlots,
      expectedBookings: reservation.selectedSlots.length,
      courtFound: Boolean(court),
      schedulesFound: schedules.length,
      bookingsFound: bookings.length,
      paymentsFound: payments.length,
      paymentQueryError,
    },
    court,
    schedules,
    bookings,
    payments,
  });
}
