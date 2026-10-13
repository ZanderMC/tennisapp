import { MercadoPagoConfig, Order } from "mercadopago";
import { NextResponse } from "next/server";
import { getOrder, updateOrder } from "@/src/lib/checkout-store";
import { prisma } from "@/src/lib/prisma";

const MAX_SERIALIZABLE_RETRIES = 3;

type PaymentRequestBody = {
  orderId?: string;
  formData?: Record<string, unknown>;
};

class ReservationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReservationConflictError";
  }
}

function isPublicHttpsUrl(urlValue: string | undefined): boolean {
  if (!urlValue) {
    return false;
  }

  try {
    const parsed = new URL(urlValue);
    const host = parsed.hostname.toLowerCase();

    if (parsed.protocol !== "https:") {
      return false;
    }

    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return false;
    }

    if (host.endsWith(".local")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function getValidNotificationUrl(candidate: string | undefined, fallback: string): string | undefined {
  if (isPublicHttpsUrl(candidate)) {
    return candidate;
  }

  if (isPublicHttpsUrl(fallback)) {
    return fallback;
  }

  return undefined;
}

function getPaymentErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const record = error as {
      message?: unknown;
      cause?: Array<{ description?: unknown }>;
      causes?: Array<{ description?: unknown }>;
    };

    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }

    const firstCause = record.causes?.[0] ?? record.cause?.[0];
    if (firstCause && typeof firstCause.description === "string" && firstCause.description.trim()) {
      return firstCause.description;
    }
  }

  return "Error inesperado al procesar el pago.";
}

type PaymentRejection = {
  statusDetail: string;
  message: string;
};

function getPaymentRejection(error: unknown): PaymentRejection | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const record = error as {
    name?: unknown;
    status?: unknown;
    message?: unknown;
    error?: unknown;
    cause?: unknown;
    causes?: unknown;
  };
  const causes = Array.isArray(record.causes)
    ? record.causes
    : Array.isArray(record.cause)
      ? record.cause
      : [];

  for (const cause of causes) {
    if (typeof cause !== "object" || cause === null) {
      continue;
    }

    const causeRecord = cause as {
      code?: unknown;
      description?: unknown;
      status_detail?: unknown;
    };
    const statusDetail =
      typeof causeRecord.code === "string"
        ? causeRecord.code
        : typeof causeRecord.status_detail === "string"
          ? causeRecord.status_detail
          : undefined;

    if (!statusDetail?.startsWith("cc_rejected_")) {
      continue;
    }

    return {
      statusDetail,
      message:
        typeof causeRecord.description === "string" && causeRecord.description.trim()
          ? causeRecord.description
          : typeof record.message === "string" && record.message.trim()
            ? record.message
            : "El pago fue rechazado por Mercado Pago.",
    };
  }

  if (record.status === 402 || record.name === "MPPaymentError") {
    return {
      statusDetail: "cc_rejected_other_reason",
      message:
        typeof record.message === "string" && record.message !== "MercadoPago API error"
          ? record.message
          : "El pago fue rechazado por Mercado Pago.",
    };
  }

  return null;
}

function getCredentialMode(value: string | undefined): "test" | "production" | "unknown" {
  if (value?.startsWith("TEST-")) {
    return "test";
  }

  if (value?.startsWith("APP_USR-")) {
    return "production";
  }

  return "unknown";
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

function isPrismaErrorWithCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Error inesperado";
}

function isReservationConflictError(error: unknown): error is ReservationConflictError {
  if (error instanceof ReservationConflictError) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  return message.includes("ya está reservado") || message.includes("ya fue reservado");
}

async function withSerializableRetries<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_SERIALIZABLE_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === MAX_SERIALIZABLE_RETRIES - 1;
      if (!isPrismaErrorWithCode(error, "P2034") || isLastAttempt) {
        throw error;
      }
    }
  }

  throw new Error("No se pudo confirmar la reserva por concurrencia");
}

async function assertReservationStillAvailable(order: Awaited<ReturnType<typeof getOrder>>) {
  if (!order?.reservation) {
    return;
  }

  const parsed = parseDateKey(order.reservation.selectedDate);
  if (!parsed) {
    throw new Error("La fecha de la reserva es inválida.");
  }

  const uniqueSlots = Array.from(new Set(order.reservation.selectedSlots));
  if (uniqueSlots.length === 0) {
    throw new Error("La orden no tiene horarios para reservar.");
  }

  const court = await prisma.court.findFirst({
    where: { name: order.reservation.court },
    select: { id: true },
  });

  if (!court) {
    return;
  }

  for (const slot of uniqueSlots) {
    const existingBooking = await prisma.booking.findFirst({
      where: {
        schedule: {
          courtId: court.id,
          date: {
            gte: parsed.start,
            lt: parsed.end,
          },
          timeStart: slot,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!existingBooking) {
      continue;
    }

    if (!order.userId || existingBooking.userId !== order.userId) {
      throw new ReservationConflictError(`La reserva ya está hecha para el horario ${slot}.`);
    }
  }
}

async function persistApprovedOrder(input: {
  order: Awaited<ReturnType<typeof getOrder>>;
  paymentId: string;
  paymentMethod?: string;
  statusDetail?: string;
}) {
  const order = input.order;
  const userId = order?.userId;

  if (!userId || !order?.reservation || order.reservationPersistedAt) {
    return;
  }

  const parsed = parseDateKey(order.reservation.selectedDate);
  if (!parsed) {
    throw new Error("La fecha de la reserva es inválida.");
  }

  const uniqueSlots = Array.from(new Set(order.reservation.selectedSlots));
  if (uniqueSlots.length === 0) {
    throw new Error("La orden no tiene horarios para reservar.");
  }

  const amountPerBooking = Number((order.amount / uniqueSlots.length).toFixed(2));

  const bookingIds = await withSerializableRetries(async () => {
    return prisma.$transaction(
      async (tx) => {
        const courtRows = await tx.$queryRawUnsafe<Array<{ id: number }>>(
          `SELECT "id" FROM "Court" WHERE "name" = $1 LIMIT 1`,
          order.reservation?.court ?? "Cancha",
        );

        const courtId =
          courtRows[0]?.id ??
          (
            await tx.$queryRawUnsafe<Array<{ id: number }>>(
              `
                INSERT INTO "Court" ("name", "price", "updatedAt")
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                RETURNING "id"
              `,
              order.reservation?.court ?? "Cancha",
              amountPerBooking,
            )
          )[0].id;

        const ids: number[] = [];

        for (const slot of uniqueSlots) {
          const scheduleRows = await tx.$queryRawUnsafe<Array<{ id: number }>>(
            `
              SELECT "id"
              FROM "Schedule"
              WHERE "courtId" = $1
                AND "date" >= $2
                AND "date" < $3
                AND "timeStart" = $4
              ORDER BY "id" ASC
              LIMIT 1
            `,
            courtId,
            parsed.start,
            parsed.end,
            slot,
          );

          const scheduleId =
            scheduleRows[0]?.id ??
            (
              await tx.$queryRawUnsafe<Array<{ id: number }>>(
                `
                  INSERT INTO "Schedule" ("courtId", "date", "timeStart", "timeEnd", "updatedAt")
                  VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                  RETURNING "id"
                `,
                courtId,
                parsed.marker,
                slot,
                getEndTime(slot),
              )
            )[0].id;

          const existingBookingRows = await tx.$queryRawUnsafe<Array<{ id: number; userId: string }>>(
            `
              SELECT b."id", b."userId"
              FROM "Booking" b
              INNER JOIN "Schedule" s ON s."id" = b."scheduleId"
              WHERE s."courtId" = $1
                AND s."date" >= $2
                AND s."date" < $3
                AND s."timeStart" = $4
              LIMIT 1
            `,
            courtId,
            parsed.start,
            parsed.end,
            slot,
          );

          const existingBooking = existingBookingRows[0];

          if (existingBooking) {
            if (existingBooking.userId !== userId) {
              throw new ReservationConflictError(`La reserva ya está hecha para el horario ${slot}.`);
            }

            await tx.$executeRawUnsafe(
              `
                UPDATE "Booking"
                SET "amount" = $2, "status" = 'PAID', "updatedAt" = CURRENT_TIMESTAMP
                WHERE "id" = $1
              `,
              existingBooking.id,
              amountPerBooking,
            );

            ids.push(existingBooking.id);
            continue;
          }

          try {
            const created = (
              await tx.$queryRawUnsafe<Array<{ id: number }>>(
                `
                  INSERT INTO "Booking" ("userId", "scheduleId", "amount", "status", "updatedAt")
                  VALUES ($1, $2, $3, 'PAID', CURRENT_TIMESTAMP)
                  RETURNING "id"
                `,
                userId,
                scheduleId,
                amountPerBooking,
              )
            )[0];

            ids.push(created.id);
          } catch (error) {
            if (!isPrismaErrorWithCode(error, "P2002")) {
              throw error;
            }

            const concurrentBookingRows = await tx.$queryRawUnsafe<Array<{ id: number; userId: string }>>(
              `
                SELECT b."id", b."userId"
                FROM "Booking" b
                INNER JOIN "Schedule" s ON s."id" = b."scheduleId"
                WHERE s."courtId" = $1
                  AND s."date" >= $2
                  AND s."date" < $3
                  AND s."timeStart" = $4
                LIMIT 1
              `,
              courtId,
              parsed.start,
              parsed.end,
              slot,
            );

            const concurrentBooking = concurrentBookingRows[0];
            if (!concurrentBooking) {
              throw error;
            }

            if (concurrentBooking.userId !== userId) {
              throw new ReservationConflictError(`La reserva ya está hecha para el horario ${slot}.`);
            }

            ids.push(concurrentBooking.id);
          }
        }

        return ids;
      },
      { isolationLevel: "Serializable" as never }
    );
  });

  for (const bookingId of bookingIds) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "Payment" (
          "bookingId",
          "mpPaymentId",
          "status",
          "method",
          "amount",
          "externalRef",
          "updatedAt"
        )
        VALUES ($1, $2, 'APPROVED', $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT ("bookingId")
        DO UPDATE SET
          "mpPaymentId" = EXCLUDED."mpPaymentId",
          "status" = EXCLUDED."status",
          "method" = EXCLUDED."method",
          "amount" = EXCLUDED."amount",
          "externalRef" = EXCLUDED."externalRef",
          "updatedAt" = CURRENT_TIMESTAMP
      `,
      bookingId,
      input.paymentId,
      input.paymentMethod ?? input.statusDetail ?? null,
      amountPerBooking,
      order.id,
    );
  }

  await updateOrder(order.id, {
    reservationPersistedAt: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const accessToken = process.env.MP_ACCESS_TOKEN?.trim();
  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY?.trim();

  if (!accessToken) {
    return NextResponse.json(
      {
        message: "Falta MP_ACCESS_TOKEN en las variables de entorno.",
      },
      { status: 500 },
    );
  }

  if (accessToken === publicKey) {
    return NextResponse.json(
      {
        message:
          "MP_ACCESS_TOKEN no puede ser igual a NEXT_PUBLIC_MP_PUBLIC_KEY. Usa el Access Token privado de Mercado Pago.",
      },
      { status: 500 },
    );
  }

  const accessTokenMode = getCredentialMode(accessToken);
  const publicKeyMode = getCredentialMode(publicKey);

  if (accessTokenMode !== "unknown" && publicKeyMode !== "unknown" && accessTokenMode !== publicKeyMode) {
    return NextResponse.json(
      {
        message:
          "Las credenciales de Mercado Pago no coinciden: usa una clave pública y un access token TEST juntos, o ambos de producción.",
      },
      { status: 500 },
    );
  }

  let body: PaymentRequestBody;

  try {
    body = (await request.json()) as PaymentRequestBody;
  } catch {
    return NextResponse.json(
      {
        message: "Body invalido. Envia JSON con orderId y formData.",
      },
      { status: 400 },
    );
  }

  const orderId = body.orderId;
  const formData = body.formData;

  if (!orderId || !formData || typeof formData !== "object") {
    return NextResponse.json(
      {
        message: "Faltan datos del pago. Se requiere orderId y formData.",
      },
      { status: 400 },
    );
  }

  const order = await getOrder(orderId);

  if (!order) {
    return NextResponse.json({ message: "Orden no encontrada." }, { status: 404 });
  }

  if (order.status === "approved") {
    if (!order.reservationPersistedAt && order.reservation) {
      try {
        await persistApprovedOrder({
          order,
          paymentId: order.paymentId ?? "unknown",
          statusDetail: order.statusDetail,
        });
      } catch (error) {
        if (isReservationConflictError(error)) {
          const message = getErrorMessage(error);
          await updateOrder(order.id, { status: "cancelled", statusDetail: message });
          return NextResponse.json({ message }, { status: 409 });
        }

        throw error;
      }
    }

    return NextResponse.json({
      id: order.paymentId ?? "-",
      status: order.status,
      status_detail: order.statusDetail,
      orderId: order.id,
    });
  }

  try {
    await assertReservationStillAvailable(order);

    const requestUrl = new URL(request.url);
    const fallbackNotificationUrl = `${requestUrl.origin}/api/checkout/webhook`;
    const notificationUrl = getValidNotificationUrl(
      process.env.MP_NOTIFICATION_URL,
      fallbackNotificationUrl,
    );

    const client = new MercadoPagoConfig({ accessToken });
    const orderClient = new Order(client);
    const paymentMethodId = typeof formData.payment_method_id === "string"
      ? formData.payment_method_id
      : undefined;
    const cardToken = typeof formData.token === "string" ? formData.token : undefined;
    const installments = Number(formData.installments ?? 1);
    const payer =
      typeof formData.payer === "object" && formData.payer !== null
        ? (formData.payer as { email?: unknown })
        : undefined;

    if (!paymentMethodId || !cardToken || !Number.isInteger(installments) || installments < 1) {
      return NextResponse.json(
        { message: "El formulario no generó un token de tarjeta válido." },
        { status: 400 },
      );
    }

    const createdOrder = await orderClient.create({
      body: {
        type: "online",
        processing_mode: "automatic",
        capture_mode: "automatic",
        total_amount: order.amount.toFixed(2),
        description: order.description,
        external_reference: order.id,
        items: order.items.map((item) => ({
            external_code: item.id,
            title: item.title,
            description: item.description,
            category_id: item.category_id,
            unit_price: item.unit_price.toFixed(2),
            quantity: item.quantity,
        })),
        payer: typeof payer?.email === "string" ? { email: payer.email } : undefined,
        transactions: {
          payments: [
            {
              amount: order.amount.toFixed(2),
              payment_method: {
                id: paymentMethodId,
                type: "credit_card",
                token: cardToken,
                installments,
                statement_descriptor: "TIENDA DEMO",
              },
            },
          ],
        },
        ...(notificationUrl ? { config: { online: { callback_url: notificationUrl } } } : {}),
      },
      requestOptions: {
        // Evita cobros duplicados del mismo pedido si hay reintentos de red.
        idempotencyKey: `order-${order.id}`,
      },
    });

    const transactionPayment = createdOrder.transactions?.payments?.[0];
    const paymentStatus = mapOrderStatus(createdOrder.status, transactionPayment?.status);
    const paymentId = transactionPayment?.id ?? createdOrder.id;

    const updated = await updateOrder(order.id, {
      paymentId: paymentId ? String(paymentId) : undefined,
      status: paymentStatus,
      statusDetail: transactionPayment?.status_detail ?? createdOrder.status_detail,
    });

    if (paymentStatus === "approved") {
      try {
        await persistApprovedOrder({
          order: updated ?? order,
          paymentId: String(paymentId),
          paymentMethod: transactionPayment?.payment_method?.id,
          statusDetail: transactionPayment?.status_detail ?? createdOrder.status_detail,
        });
      } catch (persistError) {
        if (isReservationConflictError(persistError)) {
          const message = getErrorMessage(persistError);
          await updateOrder(order.id, {
            status: "cancelled",
            statusDetail: message,
          });

          return NextResponse.json({ message }, { status: 409 });
        }

        throw persistError;
      }
    }

    return NextResponse.json({
      id: paymentId,
      status: paymentStatus,
      status_detail: transactionPayment?.status_detail ?? createdOrder.status_detail,
      orderId: updated?.id ?? order.id,
    });
  } catch (error) {
    console.error("Error al crear pago", error);

    if (isReservationConflictError(error)) {
      const message = getErrorMessage(error);
      await updateOrder(order.id, { status: "cancelled", statusDetail: message });
      return NextResponse.json({ message }, { status: 409 });
    }

    const paymentRejection = getPaymentRejection(error);

    if (paymentRejection) {
      const updated = await updateOrder(order.id, {
        status: "rejected",
        statusDetail: paymentRejection.statusDetail,
      });

      return NextResponse.json({
        id: updated?.paymentId ?? order.id,
        status: "rejected",
        status_detail: paymentRejection.statusDetail,
        orderId: updated?.id ?? order.id,
        message: paymentRejection.message,
      });
    }

    const sdkMessage = getPaymentErrorMessage(error);

    return NextResponse.json(
      {
        message: sdkMessage,
      },
      { status: 500 },
    );
  }
}
