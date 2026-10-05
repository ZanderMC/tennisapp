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
    <aside className="w-64 bg-amber-500 p-4">
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
                  ? "bg-amber-900 text-white"
                  : "bg-amber-200 text-amber-900 hover:bg-amber-100"
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
