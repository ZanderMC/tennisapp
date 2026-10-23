'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/stats", label: "Stats" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-emerald-900 p-4">
      <h2 className="mb-4 text-lg font-bold text-white">Administracion</h2>
      <nav className="flex flex-col gap-2" aria-label="Secciones de administrador">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-4 py-2 text-left font-semibold transition ${
                isActive
                  ? "bg-green-950 text-white  "
                  : "bg-[#F3EDE4] text-green-9500 hover:bg-[#ecdcc4]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
