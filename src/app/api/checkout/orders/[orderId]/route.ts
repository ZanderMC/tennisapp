import { NextResponse } from "next/server";
import { getOrder } from "@/src/lib/checkout-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;
  const order = await getOrder(orderId);

  if (!order) {
    return NextResponse.json({ message: "Orden no encontrada" }, { status: 404 });
  }

  return NextResponse.json(order);
}
