'use client';

import { authClient } from "@/src/lib/auth-client";
import { FormEvent, useEffect, useRef, useState } from "react";

type ModalSigninProps = {
    onClose: () => void;
    onSwitchToSignup: () => void;
   
};

export function ModalSignin({ onClose, onSwitchToSignup ,  }: ModalSigninProps) {
    const modalRef = useRef<HTMLElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        firstInputRef.current?.focus();

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key !== "Tab" || !modalRef.current) {
                return;
            }

            const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            if (focusableElements.length === 0) {
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const activeElement = document.activeElement;

            if (event.shiftKey && activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        const form = event.currentTarget;
        if (!form.checkValidity()) {
            setError("Introduce un email valido y una contrasena de al menos 8 caracteres.");
            form.querySelector<HTMLElement>(":invalid")?.focus();
            return;
        }

        const formData = new FormData(form);
        const email = String(formData.get("email") ?? "");
        const password = String(formData.get("password") ?? "");

        setIsSubmitting(true);
        try {
            const { error: signInError } = await authClient.signIn.email({
                email,
                password,
            });

            if (signInError) {
                setError(signInError.message || "No se pudo iniciar sesion. Revisa tus datos e intenta nuevamente.");
                return;
            }

            onClose();
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "No se pudo iniciar sesion. Revisa tu conexion e intenta nuevamente."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Cerrar modal"
                onClick={onClose}
                className="absolute inset-0 bg-black/60"
            />

            <section
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="signin-title"
                aria-describedby="signin-description"
                className="relative z-10 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl"
            >
                <h2 id="signin-title" className="text-xl font-semibold text-zinc-900">Inicia sesion</h2>
                <p id="signin-description" className="mt-1 text-sm text-zinc-600">Inicia sesion para comprar tu reserva.</p>

                <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
                    <label htmlFor="signin-email" className="block text-sm font-medium text-zinc-800">Email</label>
                    <input
                        ref={firstInputRef}
                        type="email"
                        name="email"
                        id="signin-email"
                        placeholder="john.doe@gmail.com"
                        required
                        onChange={() => setError(null)}
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 outline-none focus:border-gray-300  "
                    />

                    <label htmlFor="signin-password" className="block text-sm font-medium text-zinc-800">Contrasena</label>
                    <input
                        type="password"
                        name="password"
                        id="signin-password"
                        placeholder="Contrasena"
                        required
                        minLength={8}
                        onChange={() => setError(null)}
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 outline-none focus:border-gray-300  "
                    />

                    {error && (
                        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert" aria-live="polite">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-2 w-full rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                    >
                        {isSubmitting ? "Iniciando sesion..." : "Iniciar sesion"}
                    </button>
                </form>

                <div className="mt-4 flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
                    >
                        Cerrar
                    </button>
                    <p className="text-center text-sm text-zinc-600">
                        No tienes una cuenta?{" "}
                        <button
                            type="button"
                            onClick={onSwitchToSignup}
                            className="font-semibold text-green-700 hover:text-green-800"
                        >
                            Registrate
                        </button>
                    </p>
                </div>
            </section>
        </div>
    );
}
