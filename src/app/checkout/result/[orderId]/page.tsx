import { OrderStatusCard } from "@/src/components/order-status-card";

 
export default async function CheckoutResultPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold">Estado de tu pago</h1>
        <p className="text-sm opacity-80">
          Esta pantalla consulta el estado real de la orden en el backend.
        </p>
      </section>

      <OrderStatusCard  orderId={orderId} />
    </main>
  );
}
