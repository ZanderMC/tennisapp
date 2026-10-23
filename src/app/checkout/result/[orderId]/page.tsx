import { OrderStatusCard } from "@/src/components/order-status-card";
import Link from "next/link";

 
export default async function CheckoutResultPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6   px-4 py-8 sm:px-6 sm:py-12">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold sm:text-3xl">Estado de tu pago</h1>
        
      </section>

      <OrderStatusCard  orderId={orderId} />

      <Link
        href="/"
        className="w-fit rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
