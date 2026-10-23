import { NextResponse } from "next/server";
import { createOrder } from "@/src/lib/checkout-store";
import { auth } from "@/src/lib/auth";

type OrderRequestBody = {
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

   

  return NextResponse.json({ message: "Datos de reserva incompletos." }, { status: 400 });
}
