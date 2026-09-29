import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "./prisma";
import { nextCookies } from "better-auth/next-js";
// If your Prisma file is located elsewhere, you can change the path
 export const auth = betterAuth({
    user: {
        additionalFields: {
            rol: {
                type: "string",
                required: false,
                defaultValue: "USER",
                input: false,
            },
        },
    },
    
    database: prismaAdapter(prisma, {
        provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false, // Set to true if you want to require email verification
    },
     plugins: [nextCookies()],
});