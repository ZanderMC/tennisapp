import { NextResponse } from "next/server";

export async function POST() {
  const accessToken = process.env.MP_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json(
      { error: "MP_ACCESS_TOKEN no está configurado" },
      { status: 500 }
    );
  }

  try {
    // Generar token de tarjeta primero
    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

    // Este es el payload mínimo que debería funcionar
    const paymentPayload = {
      token: "test_visa_token_" + Date.now(), // Token temporal para prueba
      payment_method_id: "visa",
      transaction_amount: 0.5,
      installments: 1,
      payer: {
        email: "test@mercadopago.com",
      },
      description: "Prueba de pago",
      external_reference: "test_" + Date.now(),
    };

    console.log("[Debug Test] Enviando payload a MercadoPago:", JSON.stringify(paymentPayload, null, 2));

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    const data = await response.json();

    console.log("[Debug Test] Respuesta de MercadoPago:", {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      data: data,
    });

    return NextResponse.json({
      status: response.status,
      success: response.ok,
      data: data,
      tokenInfo: {
        startsWithTEST: accessToken.startsWith("TEST-"),
        length: accessToken.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error al hacer test de pago",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
