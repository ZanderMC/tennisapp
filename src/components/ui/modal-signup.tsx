'use client';

import { useEffect, useRef } from "react";
import { registerEmail } from "../../../server/auth-action";

type ModalSignupProps = {
    onClose: () => void;
    onSwitchToSignin: () => void;
};

export function ModalSignup({ onClose, onSwitchToSignin }: ModalSignupProps) {
    const modalRef = useRef<HTMLElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);

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
                aria-labelledby="signup-title"
                aria-describedby="signup-description"
                className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl"
            >
                <h2 id="signup-title" className="text-xl font-semibold text-zinc-900">Crea una cuenta</h2>
                <p id="signup-description" className="mt-1 text-sm text-zinc-600">Necesitas una cuenta para comprar tu reserva.</p>

                <form className="mt-5 space-y-3" action={registerEmail}>
                    <label htmlFor="signup-name" className="block text-sm font-medium text-zinc-800">Nombre</label>
                    <input
                        ref={firstInputRef}
                        type="text"
                        name="name"
                        id="signup-name"
                        placeholder="John Doe"
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 outline-none focus:b-300  "
                    />

                    <label htmlFor="signup-email" className="block text-sm font-medium text-zinc-800">Email</label>
                    <input
                        type="email"
                        id="signup-email"
                        name="email"
                        placeholder="john.doe@gmail.com"
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 outline-none focus:border-gray-300  "
                    />

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label htmlFor="signup-password" className="block text-sm font-medium text-zinc-800">Contrasena</label>
                            <input
                                name="password"
                                type="password"
                                id="signup-password"
                                placeholder="Contrasena"
                                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 outline-none focus:border-gray-300  "
                            />
                        </div>
                        {/* <div>
                            <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-zinc-800">Confirmar contrasena</label>
                            <input
                                name="confirmPassword"
                                type="password"
                                id="signup-confirm-password"
                                placeholder="Confirmar contrasena"
                                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 outline-none focus:border-gray-300  "
                            />
                        </div> */}
                    </div>

                    <button
                      type="submit"
                        className="mt-2 w-full rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                    >
                        Registrarse
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
                        Ya tienes una cuenta?{" "}
                        <button
                            type="button"
                            onClick={onSwitchToSignin}
                            className="font-semibold text-green-700 hover:text-green-800"
                        >
                            Inicia sesion
                        </button>
                    </p>
                </div>
            </section>
        </div>
    );
}
