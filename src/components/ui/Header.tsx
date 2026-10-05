'use client'
import { useState } from "react";
import { ModalSignin } from "./modal-sign-in";
import { ModalSignup } from "./modal-signup";
import { authClient } from "@/src/lib/auth-client";
import Link from "next/link";

export function Header() {
    const [activeModal, setActiveModal] = useState<"signin" | "signup" | null>(null);
    const { data: session, isPending } = authClient.useSession();
    const roleData = session?.user as { rol?: string; role?: string } | undefined;
    const userRole = (roleData?.rol ?? roleData?.role ?? "").trim().toLowerCase();
    const isAdmin = Boolean(session) && userRole === "admin";

     return (
        <>
            <header className="bg-white w-full h-20 flex items-center justify-center px-8 py-4 ">
                <nav className="flex flex-row gap-2">
                    {!isPending && !session && (
                        <>
                            <button
                                type="button"
                                onClick={() => setActiveModal("signin")}
                                className="bg-green-500 px-6 py-3 rounded-lg cursor-pointer"
                            >
                                Login
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveModal("signup")}
                                className="border-2 border-green-500 px-6 py-3 rounded-lg cursor-pointer"
                            >
                                Register
                            </button>
                        </>
                    )}
                    {!isPending && isAdmin && (
                        <Link
                            href="/admin"
                            className="bg-green-500 px-6 py-3 rounded-lg cursor-pointer"
                        >
                            Administrar
                        </Link>
                    )}
                 
                </nav>
            </header>

            {activeModal === "signin" && (
                <ModalSignin
                    onClose={() => setActiveModal(null)}
                    onSwitchToSignup={() => setActiveModal("signup")}
                />
            )}

            {activeModal === "signup" && (
                <ModalSignup
                    onClose={() => setActiveModal(null)}
                    onSwitchToSignin={() => setActiveModal("signin")}
                />
            )}
        </>
    )
}

 