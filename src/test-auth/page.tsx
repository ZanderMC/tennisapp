"use client";

import { authClient } from "@/src/lib/auth-client";

export default function TestAuthPage() {
  async function handleLogin() {
  const { data, error } = await authClient.signIn.email({
    email: "test@example.com",
    password: "Password123!",
  });

  console.log("DATA:", data);
  console.log("ERROR:", error);
}

  return (
    <main>
      <h1>Test Better Auth</h1>

      <button onClick={handleLogin}>
        Crear usuario
      </button>
    </main>
  );
}
