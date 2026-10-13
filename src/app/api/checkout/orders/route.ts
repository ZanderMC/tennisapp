import { NextResponse } from "next/server";
import { createOrder } from "@/src/lib/checkout-store";
import { getProductById } from "@/src/lib/products";
import { auth } from "@/src/lib/auth";



type OrderRequestBody = {
  productId?: string;
  court?: string;
  selectedDate?: string;
  selectedSlots?: string[];
  total?: number;
};

export async function POST(request: Request) {
  let body: OrderRequestBody = {};

  try {
    body = (await request.json()) as OrderRequestBody;
  } catch {
    // body inicia vacio
  }

  const productId = body?.productId;

  if (body.court && body.selectedDate && Array.isArray(body.selectedSlots) && body.selectedSlots.length > 0) {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const court = body.court.trim();
    const selectedDate = body.selectedDate.trim();
    const selectedSlots = body.selectedSlots.map((slot) => slot.trim()).filter(Boolean);
    const total = Number(body.total ?? 0);

    if (!court || !selectedDate || selectedSlots.length === 0 || !Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ message: "Datos de reserva inválidos." }, { status: 400 });
    }

    const slotPrice = Number((total / selectedSlots.length).toFixed(2));
    const description = `Reserva ${court} - ${selectedDate} (${selectedSlots.join(", ")})`;

    const order = await createOrder({
      productId: "court_booking",
      userId: session.user.id,
      reservation: {
        court,
        selectedDate,
        selectedSlots,
        total,
      },
      items: [
        {
          id: `court_${court.replace(/\s+/g, "_").toLowerCase()}`,
          title: `Reserva ${court}`,
          description,
          category_id: "services",
          unit_price: slotPrice,
          quantity: selectedSlots.length,
          currency_id: "PEN",
        },
      ],
      amount: total,
      description,
      currency: "PEN",
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      description: order.description,
      status: order.status,
    });
  }

  if (!productId) {
    return NextResponse.json({ message: "Se requiere productId." }, { status: 400 });
  }

  const product = getProductById(productId);

  if (!product) {
    return NextResponse.json({ message: "Producto no encontrado." }, { status: 404 });
  }

  const order = await createOrder({
    productId: product.id,
    items: [
      {
        id: product.id,
        title: product.name,
        description: product.description,
        category_id: product.categoryId,
        unit_price: product.price,
        quantity: 1,
        currency_id: product.currency,
      },
    ],
    amount: product.price,
    description: product.description,
    currency: product.currency,
  });

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    description: order.description,
    status: order.status,
  });
}
