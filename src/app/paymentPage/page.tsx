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
    <PaymentPageClient
      reservation={{
        court,
        selectedDate,
        selectedSlots,
        total,
      }}
    />
  );
}
