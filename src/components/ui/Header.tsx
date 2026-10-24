'use client'
import { useState } from "react";
import { ModalSignin } from "./modal-sign-in";
import { ModalSignup } from "./modal-signup";
import { authClient } from "@/src/lib/auth-client";
import Link from "next/link";
import { SignOut } from "@/server/auth-action";

export function Header() {
    const [activeModal, setActiveModal] = useState<"signin" | "signup" | null>(null);
    const { data: session, isPending } = authClient.useSession();
    const roleData = session?.user as { rol?: string;} | undefined;
    const userRole = (roleData?.rol ??  "").trim().toLowerCase();
    const isAdmin = Boolean(session) && userRole === "admin";
     
      return (
        <>
            <header className="bg-[#FFFFFF] w-full h-20 flex items-center justify-center px-8 py-4 sticky top-0 z-1000 ">
                <nav className="flex flex-row gap-2">
                    {!isPending && !session && (
                        <>
                            <button
                                type="button"
                                onClick={() =>  setActiveModal("signin")}
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
                    {!isPending && session && (
                        <form action={SignOut}>
                            <button
                                type="submit"
                                className="border-2 border-red-500 px-6 py-3 rounded-lg cursor-pointer text-red-600"
                            >
                                SignOut
                            </button>
                        </form>
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

 