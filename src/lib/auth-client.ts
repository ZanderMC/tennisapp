import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    /** Use the deployed origin in production; same-origin is the local fallback. */
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
})