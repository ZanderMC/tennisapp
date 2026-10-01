"use server"

import {auth} from "@/src/lib/auth";
import { redirect } from "next/navigation";   
import { headers } from "next/headers";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "object" && error !== null) {
        const maybeError = error as {
            message?: string;
            body?: { message?: string };
            cause?: { message?: string };
        };

        return (
            maybeError.body?.message ??
            maybeError.cause?.message ??
            maybeError.message ??
            "Error desconocido"
        );
    }

    return "Error desconocido";
}

export async  function registerEmail(formdata: FormData) {
const name = formdata.get("name") as string;
const email = formdata.get("email") as string;
const password = formdata.get("password") as string;
 
if (!name || !email || !password) {
    throw new Error("Completa nombre, email y contrasena.");
}

try {
    await auth.api.signUpEmail({
        body: {
            email,
            password,
            name,
        },
        headers: await headers()
    });
} catch (error) {
    throw new Error(`No se pudo crear el usuario: ${getErrorMessage(error)}`);
}

 redirect("/");
}
 

export async  function LoginEmail(formdata: FormData) {
 const email = formdata.get("email") as string;
const password = formdata.get("password") as string;

if (!email || !password) {
    throw new Error("Completa email y contrasena.");
}

try {
    await auth.api.signInEmail({
        body: {
            email,
            password,
         },
        headers: await headers()
    });
} catch (error) {
    throw new Error(`No se pudo iniciar sesion: ${getErrorMessage(error)}`);
}

redirect("/");
}
 

export async  function SignOut(formdata: FormData) {
 

await auth.api.signOut({
 
    headers: await headers()
}
)
}
 