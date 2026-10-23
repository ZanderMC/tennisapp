import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    /** An omitted base URL keeps auth requests on the current deployment origin. */
})