'use client';

import { authClient } from "@/src/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ModalSignin } from "./modal-sign-in";
import { ModalSignup } from "./modal-signup";

type AuthModal = "signup" | "signin" | null;

type BuyButtonProps = {
    court: string;
    selectedDate: Date | null;
    selectedSlots: string[];
    total: number;
};

function toDayKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function BuyButton({ court, selectedDate, selectedSlots, total }: BuyButtonProps) {
    const triggerButtonRef = useRef<HTMLButtonElement>(null);
    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();
    const [mounted, setMounted] = useState(false);
    const [activeModal, setActiveModal] = useState<AuthModal>(null);

    useEffect(() => {
 
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!activeModal) {
            triggerButtonRef.current?.focus();
        }
    }, [activeModal]);

    async function openModal() {
        if (!selectedDate || selectedSlots.length === 0) {
            window.alert("Selecciona fecha y al menos un horario antes de comprar.");
            return;
        }

        if (isPending) {
            return;
        }

        if (session?.user) {
            const accessResponse = await fetch("/api/checkout/access", {
                method: "POST",
            });

            if (!accessResponse.ok) {
                window.alert("No se pudo preparar el acceso a pagos. Intenta nuevamente.");
                return;
            }

            const params = new URLSearchParams({
                court,
                selectedDate: toDayKey(selectedDate),
                selectedSlots: selectedSlots.join(","),
                total: total.toString(),
            });

            router.push(`/paymentPage?${params.toString()}`);
            return;
        }

        setActiveModal("signup");
    }

    function closeModal() {
        setActiveModal(null);
    }

    return (
        <>
            <button
                ref={triggerButtonRef}
                type="button"
                onClick={openModal}
                disabled={isPending}
                className="cursor-pointer rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-900"
            >
                {isPending ? "Cargando..." : "Comprar"}
            </button>

            {mounted &&
                activeModal &&
                createPortal(
                    activeModal === "signup" ? (
                        <ModalSignup onClose={closeModal} onSwitchToSignin={() => setActiveModal("signin")} />
                    ) : (
                        <ModalSignin onClose={closeModal} onSwitchToSignup={() => setActiveModal("signup")} />
                    ),
                    document.body
                )}
        </>
    );
}
