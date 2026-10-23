import {PaymentPageClient} from "@/src/components/checkout/PaymentPageClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type PaymentPageProps = {
  searchParams: Promise<{
    court?: string;
    selectedDate?: string;
    selectedSlots?: string;
    total?: string;
  }>;
};

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const cookieStore = await cookies();
  const canAccessPayment = cookieStore.get("payment_page_access")?.value === "1";
  const params = await searchParams;

  if (!canAccessPayment) {
    redirect("/");
  }

  const court = (params.court ?? "").trim();
  const selectedDate = (params.selectedDate ?? "").trim();
  const selectedSlots = (params.selectedSlots ?? "")
    .split(",")
    .map((slot) => slot.trim())
    .filter(Boolean);
  const total = Number(params.total ?? "0");

  if (!court || !selectedDate || selectedSlots.length === 0 || !Number.isFinite(total) || total <= 0) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#F3EDE4] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <PaymentPageClient
          reservation={{
            court,
            selectedDate,
            selectedSlots,
            total,
          }}
        />
      </div>
    </main>
  );
}
