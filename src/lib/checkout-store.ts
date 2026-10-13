import { prisma } from "@/src/lib/prisma";

export type OrderStatus =
  | "created"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "in_process";

export type OrderItem = {
  id: string;
  title: string;
  description: string;
  category_id: string;
  unit_price: number;
  quantity: number;
  currency_id: "PEN";
};

export type ReservationPayload = {
  court: string;
  selectedDate: string;
  selectedSlots: string[];
  total: number;
};

export type CheckoutOrder = {
  id: string;
  productId: string;
  userId?: string;
  reservation?: ReservationPayload;
  reservationPersistedAt?: string;
  items: OrderItem[];
  amount: number;
  currency: "PEN";
  description: string;
  status: OrderStatus;
  statusDetail?: string;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var _checkoutOrdersTableInitialized: boolean | undefined;
}

async function ensureCheckoutOrdersTable() {
  if (globalThis._checkoutOrdersTableInitialized) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "checkout_orders" (
      "id" TEXT PRIMARY KEY,
      "product_id" TEXT NOT NULL,
      "user_id" TEXT,
      "reservation" JSONB,
      "reservation_persisted_at" TIMESTAMP(3),
      "items" JSONB NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "currency" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "status_detail" TEXT,
      "payment_id" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "checkout_orders_payment_id_idx" ON "checkout_orders"("payment_id")`,
  );

  globalThis._checkoutOrdersTableInitialized = true;
}

type CheckoutOrderRow = {
  id: string;
  product_id: string;
  user_id: string | null;
  reservation: unknown;
  reservation_persisted_at: Date | string | null;
  items: unknown;
  amount: number;
  currency: "PEN";
  description: string;
  status: OrderStatus;
  status_detail: string | null;
  payment_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRowToOrder(row: CheckoutOrderRow): CheckoutOrder {
  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id ?? undefined,
    reservation: (row.reservation as ReservationPayload | null) ?? undefined,
    reservationPersistedAt: toIso(row.reservation_persisted_at),
    items: row.items as OrderItem[],
    amount: row.amount,
    currency: row.currency,
    description: row.description,
    status: row.status,
    statusDetail: row.status_detail ?? undefined,
    paymentId: row.payment_id ?? undefined,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

export async function createOrder(input: {
  productId: string;
  userId?: string;
  reservation?: ReservationPayload;
  items: OrderItem[];
  amount: number;
  description: string;
  currency?: "PEN";
}) {
  await ensureCheckoutOrdersTable();

  const id = crypto.randomUUID();

  const rows = await prisma.$queryRawUnsafe<CheckoutOrderRow[]>(
    `
      INSERT INTO "checkout_orders" (
        "id",
        "product_id",
        "user_id",
        "reservation",
        "items",
        "amount",
        "currency",
        "description",
        "status"
      )
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, 'created')
      RETURNING *
    `,
    id,
    input.productId,
    input.userId ?? null,
    JSON.stringify(input.reservation ?? null),
    JSON.stringify(input.items),
    input.amount,
    input.currency ?? "PEN",
    input.description,
  );

  return mapRowToOrder(rows[0]);
}

export async function getOrder(orderId: string) {
  await ensureCheckoutOrdersTable();

  const rows = await prisma.$queryRawUnsafe<CheckoutOrderRow[]>(
    `SELECT * FROM "checkout_orders" WHERE "id" = $1 LIMIT 1`,
    orderId,
  );

  if (!rows[0]) {
    return null;
  }

  return mapRowToOrder(rows[0]);
}

export async function updateOrder(
  orderId: string,
  patch: Partial<Omit<CheckoutOrder, "id" | "createdAt">>,
) {
  await ensureCheckoutOrdersTable();

  const current = await getOrder(orderId);
  if (!current) {
    return null;
  }

  const next = {
    productId: patch.productId ?? current.productId,
    userId: patch.userId ?? current.userId ?? null,
    reservation: patch.reservation ?? current.reservation ?? null,
    reservationPersistedAt: patch.reservationPersistedAt ?? current.reservationPersistedAt ?? null,
    items: patch.items ?? current.items,
    amount: patch.amount ?? current.amount,
    currency: patch.currency ?? current.currency,
    description: patch.description ?? current.description,
    status: patch.status ?? current.status,
    statusDetail: patch.statusDetail ?? current.statusDetail ?? null,
    paymentId: patch.paymentId ?? current.paymentId ?? null,
  };

  const rows = await prisma.$queryRawUnsafe<CheckoutOrderRow[]>(
    `
      UPDATE "checkout_orders"
      SET
        "product_id" = $2,
        "user_id" = $3,
        "reservation" = $4::jsonb,
        "reservation_persisted_at" = $5,
        "items" = $6::jsonb,
        "amount" = $7,
        "currency" = $8,
        "description" = $9,
        "status" = $10,
        "status_detail" = $11,
        "payment_id" = $12,
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = $1
      RETURNING *
    `,
    orderId,
    next.productId,
    next.userId,
    JSON.stringify(next.reservation),
    next.reservationPersistedAt,
    JSON.stringify(next.items),
    next.amount,
    next.currency,
    next.description,
    next.status,
    next.statusDetail,
    next.paymentId,
  );

  if (!rows[0]) {
    return null;
  }

  return mapRowToOrder(rows[0]);
}

export async function findOrderByPaymentId(paymentId: string) {
  await ensureCheckoutOrdersTable();

  const rows = await prisma.$queryRawUnsafe<CheckoutOrderRow[]>(
    `SELECT * FROM "checkout_orders" WHERE "payment_id" = $1 LIMIT 1`,
    paymentId,
  );

  if (!rows[0]) {
    return null;
  }

  return mapRowToOrder(rows[0]);
}


export async function findOrderByExternalReference(externalReference: string) {
  await ensureCheckoutOrdersTable();

  const rows = await prisma.$queryRawUnsafe<CheckoutOrderRow[]>(
    `SELECT * FROM "checkout_orders" WHERE "id" = $1 LIMIT 1`,
    externalReference,
  );

  if (!rows[0]) {
    return null;
  }

  return mapRowToOrder(rows[0]);
}