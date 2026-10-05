import { AdminSidebar }  from "@/src/components/adminPanel/AdminSidebar";
import { auth } from "@/src/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/");
  }

  const roleData = session.user as { rol?: string; role?: string };
  const userRole = (roleData.rol ?? roleData.role ?? "").trim().toLowerCase();

  if (userRole !== "admin") {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-row bg-amber-600">
      <AdminSidebar />
      <div className="w-full">{children}</div>
    </main>
  );
}
